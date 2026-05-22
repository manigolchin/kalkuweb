/**
 * Round 9 — frontend tests for CommandPalette.tsx (currently 0% coverage).
 *
 * Targets:
 *   - Closed state renders nothing
 *   - Open state renders search input + focuses
 *   - Typing filters the action list
 *   - Empty query shows default action list (nav + new project)
 *   - ESC key closes the palette (calls onClose)
 *   - Arrow keys move highlight
 *   - Enter selects highlighted item (calls onNavigate)
 *   - Mouse hover changes highlight
 *   - Click selects an item (onNavigate + close)
 *   - "Keine Treffer" empty-result message
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import CommandPalette from '../CommandPalette';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      projects: {
        ...actual.api.projects,
        list: vi.fn(),
      },
    },
  };
});

import { api } from '@/lib/api';
const projectsListMock = api.projects.list as ReturnType<typeof vi.fn>;

function renderPalette(open = true) {
  const onClose = vi.fn();
  const onNavigate = vi.fn();
  const utils = render(
    <HelmetProvider>
      <MemoryRouter>
        <CommandPalette open={open} onClose={onClose} onNavigate={onNavigate} />
      </MemoryRouter>
    </HelmetProvider>,
  );
  return { onClose, onNavigate, ...utils };
}

beforeEach(() => {
  vi.clearAllMocks();
  projectsListMock.mockResolvedValue({ projects: [] });
});

describe('CommandPalette.tsx — open/closed', () => {
  test('renders nothing when open=false', () => {
    const { container } = renderPalette(false);
    // The palette returns null when open=false, so MemoryRouter's only child
    // should be an empty wrapper.
    expect(container.querySelector('[role=dialog]')).toBeNull();
  });

  test('renders search input + Aktion+Navigation groups when open', async () => {
    renderPalette(true);
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/)).toBeDefined(),
    );
    expect(screen.getByText('Navigation')).toBeDefined();
    expect(screen.getByText('Aktion')).toBeDefined();
  });

  test('search input is focused when opened', async () => {
    renderPalette(true);
    const input = await waitFor(() =>
      screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/),
    );
    // Focus is set via a 30ms timeout — wait briefly.
    await waitFor(() => expect(document.activeElement).toBe(input));
  });
});

describe('CommandPalette.tsx — default action list', () => {
  test('shows all 5 navigation entries by default', async () => {
    renderPalette(true);
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeDefined());
    expect(screen.getByText('Kalkulation')).toBeDefined();
    expect(screen.getByText('Kunden-Feedback')).toBeDefined();
    expect(screen.getByText('Archiv')).toBeDefined();
    expect(screen.getByText('Einstellungen')).toBeDefined();
  });

  test('shows the "Neues Projekt anlegen" action', async () => {
    renderPalette(true);
    await waitFor(() => expect(screen.getByText(/Neues Projekt anlegen/)).toBeDefined());
  });
});

describe('CommandPalette.tsx — filtering', () => {
  test('typing "kalk" narrows the list to Kalkulation', async () => {
    renderPalette(true);
    const input = await waitFor(() =>
      screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/),
    );
    fireEvent.change(input, { target: { value: 'kalk' } });
    expect(screen.getByText('Kalkulation')).toBeDefined();
    expect(screen.queryByText('Archiv')).toBeNull();
  });

  test('garbage query → empty-result message "Keine Treffer"', async () => {
    renderPalette(true);
    const input = await waitFor(() =>
      screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/),
    );
    fireEvent.change(input, { target: { value: 'zzzzzz-nope' } });
    await waitFor(() => expect(screen.getByText(/Keine Treffer/)).toBeDefined());
  });
});

describe('CommandPalette.tsx — keyboard nav', () => {
  test('ESC calls onClose', async () => {
    const { onClose } = renderPalette(true);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Enter selects the first item by default → onNavigate(/panel)', async () => {
    const { onNavigate } = renderPalette(true);
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeDefined());
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onNavigate).toHaveBeenCalledWith('/panel');
  });

  test('ArrowDown + Enter selects the 2nd item (Kalkulation)', async () => {
    const { onNavigate } = renderPalette(true);
    await waitFor(() => expect(screen.getByText('Kalkulation')).toBeDefined());
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onNavigate).toHaveBeenCalledWith('/panel/kalkulation');
  });
});

describe('CommandPalette.tsx — mouse', () => {
  test('clicking an item calls onNavigate with its `to`', async () => {
    const { onNavigate } = renderPalette(true);
    await waitFor(() => expect(screen.getByText('Einstellungen')).toBeDefined());
    fireEvent.click(screen.getByText('Einstellungen'));
    expect(onNavigate).toHaveBeenCalledWith('/panel/einstellungen');
  });

  test('clicking the backdrop calls onClose', async () => {
    const { onClose } = renderPalette(true);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalled();
  });
});
