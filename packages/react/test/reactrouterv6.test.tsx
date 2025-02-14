import { render } from '@testing-library/react';
import * as React from 'react';
import {
  createRoutesFromChildren,
  matchPath,
  matchRoutes,
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-6';

import { reactRouterV6Instrumentation } from '../src';
import { withSentryReactRouterV6Routing } from '../src/reactrouterv6';

describe('React Router v6', () => {
  function createInstrumentation(_opts?: {
    startTransactionOnPageLoad?: boolean;
    startTransactionOnLocationChange?: boolean;
  }): [jest.Mock, { mockSetName: jest.Mock; mockFinish: jest.Mock; mockSetMetadata: jest.Mock }] {
    const options = {
      matchPath: _opts ? matchPath : undefined,
      startTransactionOnLocationChange: true,
      startTransactionOnPageLoad: true,
      ..._opts,
    };
    const mockFinish = jest.fn();
    const mockSetName = jest.fn();
    const mockSetMetadata = jest.fn();
    const mockStartTransaction = jest
      .fn()
      .mockReturnValue({ setName: mockSetName, finish: mockFinish, setMetadata: mockSetMetadata });

    reactRouterV6Instrumentation(
      React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    )(mockStartTransaction, options.startTransactionOnPageLoad, options.startTransactionOnLocationChange);
    return [mockStartTransaction, { mockSetName, mockFinish, mockSetMetadata }];
  }

  it('starts a pageload transaction', () => {
    const [mockStartTransaction] = createInstrumentation();
    const SentryRoutes = withSentryReactRouterV6Routing(Routes);

    render(
      <MemoryRouter initialEntries={['/']}>
        <SentryRoutes>
          <Route path="/" element={<div>Home</div>} />
        </SentryRoutes>
      </MemoryRouter>,
    );

    expect(mockStartTransaction).toHaveBeenCalledTimes(1);
    expect(mockStartTransaction).toHaveBeenLastCalledWith({
      name: '/',
      op: 'pageload',
      tags: { 'routing.instrumentation': 'react-router-v6' },
      metadata: { source: 'url' },
    });
  });

  it('skips pageload transaction with `startTransactionOnPageLoad: false`', () => {
    const [mockStartTransaction] = createInstrumentation({ startTransactionOnPageLoad: false });
    const SentryRoutes = withSentryReactRouterV6Routing(Routes);

    render(
      <MemoryRouter initialEntries={['/']}>
        <SentryRoutes>
          <Route path="/" element={<div>Home</div>} />
        </SentryRoutes>
      </MemoryRouter>,
    );

    expect(mockStartTransaction).toHaveBeenCalledTimes(0);
  });

  it('skips navigation transaction, with `startTransactionOnLocationChange: false`', () => {
    const [mockStartTransaction] = createInstrumentation({ startTransactionOnLocationChange: false });
    const SentryRoutes = withSentryReactRouterV6Routing(Routes);

    render(
      <MemoryRouter initialEntries={['/']}>
        <SentryRoutes>
          <Route path="/about" element={<div>About</div>} />
          <Route path="/" element={<Navigate to="/about" />} />
        </SentryRoutes>
      </MemoryRouter>,
    );

    expect(mockStartTransaction).toHaveBeenCalledTimes(1);
    expect(mockStartTransaction).toHaveBeenLastCalledWith({
      name: '/',
      op: 'pageload',
      tags: { 'routing.instrumentation': 'react-router-v6' },
      metadata: { source: 'url' },
    });
  });

  it('starts a navigation transaction', () => {
    const [mockStartTransaction] = createInstrumentation();
    const SentryRoutes = withSentryReactRouterV6Routing(Routes);

    render(
      <MemoryRouter initialEntries={['/']}>
        <SentryRoutes>
          <Route path="/about" element={<div>About</div>} />
          <Route path="/" element={<Navigate to="/about" />} />
        </SentryRoutes>
      </MemoryRouter>,
    );

    expect(mockStartTransaction).toHaveBeenCalledTimes(2);
    expect(mockStartTransaction).toHaveBeenLastCalledWith({
      name: '/about',
      op: 'navigation',
      tags: { 'routing.instrumentation': 'react-router-v6' },
      metadata: { source: 'route' },
    });
  });

  it('works with nested routes', () => {
    const [mockStartTransaction] = createInstrumentation();
    const SentryRoutes = withSentryReactRouterV6Routing(Routes);

    render(
      <MemoryRouter initialEntries={['/']}>
        <SentryRoutes>
          <Route path="/about" element={<div>About</div>}>
            <Route path="/about/us" element={<div>us</div>} />
          </Route>
          <Route path="/" element={<Navigate to="/about/us" />} />
        </SentryRoutes>
      </MemoryRouter>,
    );

    expect(mockStartTransaction).toHaveBeenCalledTimes(2);
    expect(mockStartTransaction).toHaveBeenLastCalledWith({
      name: '/about/us',
      op: 'navigation',
      tags: { 'routing.instrumentation': 'react-router-v6' },
      metadata: { source: 'route' },
    });
  });

  it('works with paramaterized paths', () => {
    const [mockStartTransaction] = createInstrumentation();
    const SentryRoutes = withSentryReactRouterV6Routing(Routes);

    render(
      <MemoryRouter initialEntries={['/']}>
        <SentryRoutes>
          <Route path="/about" element={<div>About</div>}>
            <Route path="/about/:page" element={<div>page</div>} />
          </Route>
          <Route path="/" element={<Navigate to="/about/us" />} />
        </SentryRoutes>
      </MemoryRouter>,
    );

    expect(mockStartTransaction).toHaveBeenCalledTimes(2);
    expect(mockStartTransaction).toHaveBeenLastCalledWith({
      name: '/about/:page',
      op: 'navigation',
      tags: { 'routing.instrumentation': 'react-router-v6' },
      metadata: { source: 'route' },
    });
  });

  it('works with paths with multiple parameters', () => {
    const [mockStartTransaction] = createInstrumentation();
    const SentryRoutes = withSentryReactRouterV6Routing(Routes);

    render(
      <MemoryRouter initialEntries={['/']}>
        <SentryRoutes>
          <Route path="/stores" element={<div>Stores</div>}>
            <Route path="/stores/:storeId" element={<div>Store</div>}>
              <Route path="/stores/:storeId/products/:productId" element={<div>Product</div>} />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/stores/foo/products/234" />} />
        </SentryRoutes>
      </MemoryRouter>,
    );

    expect(mockStartTransaction).toHaveBeenCalledTimes(2);
    expect(mockStartTransaction).toHaveBeenLastCalledWith({
      name: '/stores/:storeId/products/:productId',
      op: 'navigation',
      tags: { 'routing.instrumentation': 'react-router-v6' },
      metadata: { source: 'route' },
    });
  });
});
