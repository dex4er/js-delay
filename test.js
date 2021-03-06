import {serial as test} from 'ava';
import timeSpan from 'time-span';
import inRange from 'in-range';
import currentlyUnhandled from 'currently-unhandled';
import {AbortController} from 'abort-controller';
import m from '.';

const getCurrentlyUnhandled = currentlyUnhandled();

test('returns a resolved promise', async t => {
	const end = timeSpan();
	await m(50);
	t.true(inRange(end(), 30, 70), 'is delayed');
});

test('returns a rejected promise', async t => {
	const end = timeSpan();
	await t.throwsAsync(
		m.reject(50, {value: new Error('foo')}),
		'foo'
	);
	t.true(inRange(end(), 30, 70), 'is delayed');
});

test('able to resolve a falsy value', async t => {
	t.is(
		await m(50, {value: 0}),
		0
	);
});

test('able to reject a falsy value', async t => {
	t.plan(1);
	try {
		await m.reject(50, {value: false});
	} catch (error) {
		t.is(error, false);
	}
});

test('delay defaults to 0 ms', async t => {
	const end = timeSpan();
	await m();
	t.true(end() < 30);
});

test('reject will cause an unhandledRejection if not caught', async t => {
	const reason = new Error('foo');
	const promise = m.reject(0, {value: reason});

	await m(10);

	t.deepEqual(getCurrentlyUnhandled(), [{
		reason,
		promise
	}], 'Promise should be unhandled');

	promise.catch(() => {});
	await m(10);

	t.deepEqual(getCurrentlyUnhandled(), [], 'no unhandled rejections now');
});

test('can clear a delayed resolution', async t => {
	const end = timeSpan();
	const delayPromise = m(1000, {value: 'success!'});

	delayPromise.clear();
	const success = await delayPromise;

	t.true(end() < 30);
	t.is(success, 'success!');
});

test('can clear a delayed rejection', async t => {
	const end = timeSpan();
	const delayPromise = m.reject(1000, {value: new Error('error!')});
	delayPromise.clear();

	await t.throwsAsync(delayPromise, /error!/);
	t.true(end() < 30);
});

test('resolution can be aborted with an AbortSignal', async t => {
	const end = timeSpan();
	const abortController = new AbortController();
	setTimeout(() => abortController.abort(), 1);
	await t.throwsAsync(
		m(1000, {signal: abortController.signal}),
		{name: 'AbortError'}
	);
	t.true(end() < 30);
});

test('resolution can be aborted with an AbortSignal if a value is passed', async t => {
	const end = timeSpan();
	const abortController = new AbortController();
	setTimeout(() => abortController.abort(), 1);
	await t.throwsAsync(
		m(1000, {value: 123, signal: abortController.signal}),
		{name: 'AbortError'}
	);
	t.true(end() < 30);
});

test('rejection can be aborted with an AbortSignal if a value is passed', async t => {
	const end = timeSpan();
	const abortController = new AbortController();
	setTimeout(() => abortController.abort(), 1);
	await t.throwsAsync(
		m.reject(1000, {value: new Error(), signal: abortController.signal}),
		{name: 'AbortError'}
	);
	t.true(end() < 30);
});

test('rejects with AbortError if AbortSignal is already aborted', async t => {
	const end = timeSpan();
	const abortController = new AbortController();
	abortController.abort();
	await t.throwsAsync(
		m(1000, {signal: abortController.signal}),
		{name: 'AbortError'}
	);
	t.true(end() < 30);
});
