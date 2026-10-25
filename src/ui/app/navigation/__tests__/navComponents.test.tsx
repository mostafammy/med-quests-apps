import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { DesktopNavBar } from '../DesktopNavBar.tsx';
import { MobileBottomDock } from '../MobileBottomDock.tsx';
import { enDictionary } from '../../../../domain/i18n/dictionaries/en.ts';

describe('DesktopNavBar Component (Apple Progressive Disclosure)', () => {
  it('renders primary navigation items for non-admin users and excludes Admin', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <DesktopNavBar isAdmin={false} t={enDictionary} />
      </MemoryRouter>
    );

    expect(html).toContain('Dashboard');
    expect(html).toContain('Test');
    expect(html).toContain('Review');
    expect(html).not.toContain('/admin');
  });

  it('includes admin route and label when user is authenticated admin', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/admin']}>
        <DesktopNavBar isAdmin={true} t={enDictionary} />
      </MemoryRouter>
    );

    expect(html).toContain('/admin');
    expect(html).toContain('Admin');
  });
});

describe('MobileBottomDock Component (Floating Dynamic Glass Island)', () => {
  it('renders 5 primary dock tabs for regular users and strictly excludes admin', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <MobileBottomDock isAdmin={false} t={enDictionary} />
      </MemoryRouter>
    );

    expect(html).toContain('Dashboard');
    expect(html).toContain('Test');
    expect(html).toContain('Review');
    expect(html).toContain('Curriculum');
    expect(html).toContain('Studio');
    expect(html).not.toContain('/admin');
    expect(html).toContain('grid-cols-5');
  });

  it('renders 6 tabs including admin with grid-cols-6 when user is admin', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <MobileBottomDock isAdmin={true} t={enDictionary} />
      </MemoryRouter>
    );

    expect(html).toContain('/admin');
    expect(html).toContain('Admin');
    expect(html).toContain('grid-cols-6');
  });
});
