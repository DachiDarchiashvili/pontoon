/* global global */

import { createMemoryHistory } from 'history';
import { act } from 'react-dom/test-utils';
import sinon from 'sinon';

import * as EntitiesActions from '~/core/entities/actions';
import * as BatchActions from '~/modules/batchactions/actions';

import {
  createDefaultUser,
  createReduxStore,
  mountComponentWithStore,
} from '~/test/store';

import { EntitiesList } from './EntitiesList';

class MockIntersectionObserver {
  static map = new Map();

  static set(isIntersecting) {
    for (let callback of MockIntersectionObserver.map.values()) {
      callback([{ isIntersecting }]);
    }
  }

  constructor(callback) {
    MockIntersectionObserver.map.set(this, callback);
  }
  disconnect() {
    MockIntersectionObserver.map.delete(this);
  }
  observe() {}
}

let origIntersectionObserver;
beforeAll(() => {
  origIntersectionObserver = global.IntersectionObserver;
  global.IntersectionObserver = MockIntersectionObserver;
});
afterAll(() => {
  global.IntersectionObserver = origIntersectionObserver;
});

// Entities shared between tests
const ENTITIES = [
  { pk: 1, translation: [{ string: '', errors: [], warnings: [] }] },
  { pk: 2, translation: [{ string: '', errors: [], warnings: [] }] },
];

describe('<EntitiesList>', () => {
  beforeAll(() => {
    sinon.stub(BatchActions, 'resetSelection').returns({ type: 'whatever' });
    sinon.stub(BatchActions, 'toggleSelection').returns({ type: 'whatever' });
    sinon.stub(EntitiesActions, 'get').returns({ type: 'whatever' });
  });

  beforeEach(() => {
    // Make sure tests do not pollute one another.
    BatchActions.resetSelection.resetHistory();
    BatchActions.toggleSelection.resetHistory();
    EntitiesActions.get.resetHistory();
  });

  afterAll(() => {
    BatchActions.resetSelection.restore();
    BatchActions.toggleSelection.restore();
    EntitiesActions.get.restore();
  });

  it('shows a loading animation when there are more entities to load', () => {
    const store = createReduxStore();
    store.dispatch(EntitiesActions.receive(ENTITIES, true));
    const wrapper = mountComponentWithStore(EntitiesList, store);

    expect(wrapper.find('SkeletonLoader')).toHaveLength(1);
  });

  it("doesn't display a loading animation when there aren't entities to load", () => {
    const store = createReduxStore();
    store.dispatch(EntitiesActions.receive(ENTITIES, false));
    const wrapper = mountComponentWithStore(EntitiesList, store);

    expect(wrapper.find('SkeletonLoader')).toHaveLength(0);
  });

  it('shows a loading animation when entities are being fetched from the server', () => {
    const store = createReduxStore();
    store.dispatch(EntitiesActions.request());
    const wrapper = mountComponentWithStore(EntitiesList, store);

    expect(wrapper.find('SkeletonLoader')).toHaveLength(1);
  });

  it('shows the correct number of entities', () => {
    const history = createMemoryHistory({
      initialEntries: ['/kg/firefox/all-resources/?string=1'],
    });

    const store = createReduxStore();
    store.dispatch(EntitiesActions.receive(ENTITIES, false));
    const wrapper = mountComponentWithStore(EntitiesList, store, {}, history);

    expect(wrapper.find('Entity')).toHaveLength(2);
  });

  it('excludes current entities when requesting new entities', () => {
    jest.useFakeTimers();

    const store = createReduxStore();
    store.dispatch(EntitiesActions.receive(ENTITIES, true));
    mountComponentWithStore(EntitiesList, store);

    act(() => MockIntersectionObserver.set(true));
    jest.advanceTimersByTime(100); // default value for react-infinite-scroll-hook delayInMs

    const currentEntPks = ENTITIES.map((ent) => ent.pk);
    expect(EntitiesActions.get.args[0][4]).toEqual(currentEntPks);
  });

  it('redirects to the first entity when none is selected', () => {
    const history = createMemoryHistory({
      initialEntries: ['/kg/firefox/all-resources/'],
    });
    const spy = sinon.spy();
    history.listen(spy);

    const store = createReduxStore();
    store.dispatch(EntitiesActions.receive(ENTITIES, false));

    mountComponentWithStore(EntitiesList, store, {}, history);

    expect(spy.calledOnce).toBeTruthy();
    const [location, action] = spy.firstCall.args;
    expect(action).toBe('REPLACE');
    expect(location).toMatchObject({
      pathname: '/kg/firefox/all-resources/',
      search: '?string=1',
      hash: '',
    });
  });

  it('toggles entity for batch editing', () => {
    const store = createReduxStore();
    store.dispatch(EntitiesActions.receive(ENTITIES, false));

    // HACK to get isTranslator === true in Entity
    createDefaultUser(store, { translator_for_locales: [''] });

    const wrapper = mountComponentWithStore(EntitiesList, store);

    wrapper.find('.entity .status').first().simulate('click');

    expect(BatchActions.toggleSelection.calledOnce).toBeTruthy();
  });
});
