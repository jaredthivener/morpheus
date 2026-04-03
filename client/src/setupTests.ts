import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

const mockCanvasContext = {
	clearRect: vi.fn(),
	fillText: vi.fn(),
	setTransform: vi.fn(),
	font: '',
	textAlign: 'center',
	textBaseline: 'middle',
	shadowBlur: 0,
	shadowColor: '',
	fillStyle: '',
} as unknown as CanvasRenderingContext2D;

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
	configurable: true,
	value: vi.fn((contextId: string) => {
		if (contextId === '2d') {
			return mockCanvasContext;
		}

		return null;
	}),
});

Object.defineProperty(window, 'matchMedia', {
	configurable: true,
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

class ResizeObserverMock implements ResizeObserver {
	observe = vi.fn();

	unobserve = vi.fn();

	disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
	configurable: true,
	writable: true,
	value: ResizeObserverMock,
});
