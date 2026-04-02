import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import {
  createMatrixColumnLayout,
  MatrixRainBackground,
} from '../../components/layout/MatrixRainBackground';
import { buildAppTheme } from '../../theme';

describe('MatrixRainBackground', () => {
  it('spreads rain columns across wide viewports', () => {
    const layout = createMatrixColumnLayout(2800, 1400);
    const firstColumn = layout.columns[0];
    const lastColumn = layout.columns.at(-1);

    expect(layout.columns.length).toBeGreaterThan(52);
    expect(firstColumn?.x).toBeGreaterThan(0);
    expect(lastColumn?.x).toBeGreaterThan(2700);
  });

  it('renders a decorative hidden matrix rain canvas layer', () => {
    render(
      <ThemeProvider theme={buildAppTheme('dark')}>
        <MatrixRainBackground />
      </ThemeProvider>,
    );

    const backdrop = screen.getByTestId('matrix-rain-background');

    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('matrix-rain-canvas')).toBeInTheDocument();
  });
});