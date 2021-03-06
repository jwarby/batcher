import test from 'ava';
import sinon from 'sinon';
import batcher from './';

test('should throw if created without a method as first argument', t => {
	t.plan(3);

	t.throws(() => batcher(), TypeError, 'The first argument should be a function');
	t.throws(() => batcher(1), TypeError, 'The first argument should be a function');
	t.notThrows(() => batcher(function () {}));
});

test('should not throw if no parameters are passed to the batched call', t => {
	t.plan(3);

	const batch = batcher(function () {});

	t.notThrows(() => batch()); // No callback, e.g. batch MobX action (synchronous).
	t.notThrows(() => batch(undefined, () => 123));
	t.notThrows(() => batch({}, () => 123));
});

test.cb('should batch multiple function calls in a given interval - default is zero', t => {
	t.plan(2);

	const myMethod = sinon.spy();

	const batch = batcher(myMethod);
	const callback = () => undefined;

	batch({id: 1}, callback);
	batch({id: 2}, callback);
	batch({id: 3}, callback);
	batch({id: 4}, callback);
	batch({id: 5}, callback);

	setTimeout(() => {
		t.true(myMethod.calledOnce);
		t.true(myMethod.calledWith([{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}]));
		t.end();
	});
});

test.cb('should not batch function calls out of the interval', t => {
	t.plan(3);

	const myMethod = sinon.spy();

	const batch = batcher(myMethod);
	const callback = () => undefined;

	batch({id: 1}, callback);
	batch({id: 2}, callback);
	batch({id: 3}, callback);
	batch({id: 4}, callback);
	batch({id: 5}, callback);

	setTimeout(() => {
		batch({id: 6}, callback);

		setTimeout(() => {
			t.true(myMethod.calledTwice);
			t.true(myMethod.firstCall.calledWith([{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}]));
			t.true(myMethod.secondCall.calledWith([{id: 6}]));
			t.end();
		}, 15);
	}, 5);
});

test.cb('should not batch together function calls with different callback', t => {
	t.plan(5);

	const myMethod = sinon.spy();

	const batch = batcher(myMethod);
	const callback1 = function () {
		return 'hit me';
	};
	const callback2 = function () {
		return 'baby';
	};
	const callback3 = function () {
		return 'one more time';
	};

	batch({id: 1}, callback1);
	batch({id: 2}, callback1);
	batch({id: 3}, callback1);
	batch({id: 4}, callback1);
	batch({id: 5}, callback1);

	batch({id: 8}, callback2);
	batch({id: 9}, callback2);
	batch({id: 10}, callback2);
	batch({id: 123}, callback2);

	setTimeout(() => {
		batch({id: 6}, callback1);

		batch({id: 890}, callback3);
		batch({id: 8}, callback3);

		setTimeout(() => {
			t.true(myMethod.callCount === 4);
			t.true(myMethod.firstCall.calledWith([{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}]));
			t.true(myMethod.secondCall.calledWith([{id: 8}, {id: 9}, {id: 10}, {id: 123}]));
			t.true(myMethod.thirdCall.calledWith([{id: 6}]));
			t.true(myMethod.lastCall.calledWith([{id: 890}, {id: 8}]));
			t.end();
		}, 15);
	}, 5);
});

test.cb('should allow to define a custom interval', t => {
	t.plan(2);

	const myMethod = sinon.spy();

	const batch = batcher(myMethod, 10);
	const callback = () => undefined;

	batch({id: 1}, callback);
	batch({id: 2}, callback);
	batch({id: 3}, callback);
	batch({id: 4}, callback);
	batch({id: 5}, callback);

	setTimeout(() => {
		batch({id: 6}, callback);

		setTimeout(() => {
			t.true(myMethod.calledOnce);
			t.true(myMethod.calledWith([{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}, {id: 6}]));
			t.end();
		}, 10);
	}, 5);
});

test.cb('should allow to define a maximum limit', t => {
	t.plan(4);

	const myMethod = sinon.spy();

	const batch = batcher(myMethod, {maximum: 2});
	const callback = () => undefined;

	batch({id: 1}, callback);
	batch({id: 2}, callback);
	batch({id: 3}, callback);
	batch({id: 4}, callback);
	batch({id: 5}, callback);

	setTimeout(() => {
		t.true(myMethod.calledThrice);
		t.true(myMethod.calledWith([{id: 1}, {id: 2}]));
		t.true(myMethod.calledWith([{id: 3}, {id: 4}]));
		t.true(myMethod.calledWith([{id: 5}]));
		t.end();
	}, 5);
});

test.cb('should allow to define a maximum limit with custom intervals', t => {
	t.plan(5);

	const myMethod = sinon.spy();

	const batch = batcher(myMethod, {maximum: 2, interval: 1});
	const callback = () => undefined;

	batch({id: 1}, callback);
	batch({id: 2}, callback);
	batch({id: 3}, callback);
	batch({id: 4}, callback);
	batch({id: 5}, callback);

	setTimeout(() => {
		batch({id: 6}, callback);
		t.true(myMethod.calledWith([{id: 1}, {id: 2}]));
		t.true(myMethod.calledWith([{id: 3}, {id: 4}]));
		t.true(myMethod.calledWith([{id: 5}]));
		setTimeout(() => {
			t.true(myMethod.calledWith([{id: 6}]));
			t.true(myMethod.getCalls().length === 4);
			t.end();
		}, 5);
	}, 5);
});

test.cb('should aggregate by callback instance', t => {
	t.plan(5);

	const myMethod = sinon.spy();

	const batch = batcher(myMethod);

	batch({id: 1}, () => undefined);
	batch({id: 2}, () => undefined);
	batch({id: 3}, () => undefined);
	batch({id: 4}, () => undefined);
	batch({id: 5}, () => undefined);

	setTimeout(() => {
		t.true(myMethod.calledWith([{id: 1}]));
		t.true(myMethod.calledWith([{id: 2}]));
		t.true(myMethod.calledWith([{id: 3}]));
		t.true(myMethod.calledWith([{id: 4}]));
		t.true(myMethod.calledWith([{id: 5}]));
		t.end();
	}, 0);
});

test.cb('should not batch calls when interval=0 and setImmediate is used', t => {
	t.plan(2);

	const myMethod = sinon.spy();

	const batch = batcher(myMethod);

	batch({id: 1});
	setImmediate(() => {
		batch({id: 2});

		setImmediate(() => {
			t.true(myMethod.calledWith([{id: 1}]));
			t.true(myMethod.calledWith([{id: 2}]));
			t.end();
		});
	});
});
