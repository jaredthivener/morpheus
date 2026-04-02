import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useRef } from 'react';

const MATRIX_GLYPHS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ<>[]{}|/\\';

const pickGlyph = (seed: number): string => MATRIX_GLYPHS[seed % MATRIX_GLYPHS.length] ?? '0';

type MatrixColumn = {
  x: number;
  y: number;
  speed: number;
  seed: number;
};

type MatrixColumnLayout = {
  fontSize: number;
  trailLength: number;
  columns: MatrixColumn[];
};

export const createMatrixColumnLayout = (cssWidth: number, cssHeight: number): MatrixColumnLayout => {
  const normalizedWidth = Math.max(1, Math.floor(cssWidth));
  const normalizedHeight = Math.max(1, Math.floor(cssHeight));
  const fontSize = normalizedWidth < 900 ? 15 : 18;
  const targetColumnSpacing = normalizedWidth < 900 ? 18 : 22;
  const trailLength = normalizedWidth < 900 ? 11 : 14;
  const minimumColumns = normalizedWidth < 900 ? 18 : 24;
  const maximumColumns = normalizedWidth < 900 ? 72 : 160;
  const idealColumnCount = Math.ceil(normalizedWidth / targetColumnSpacing);
  const columnCount = Math.max(minimumColumns, Math.min(idealColumnCount, maximumColumns));
  const columnSpacing = normalizedWidth / columnCount;

  return {
    fontSize,
    trailLength,
    columns: Array.from({ length: columnCount }, (_, columnIndex) => ({
      x: columnIndex * columnSpacing + columnSpacing / 2,
      y: -Math.random() * normalizedHeight,
      speed: 0.9 + (columnIndex % 5) * 0.17,
      seed: columnIndex * 31,
    })),
  };
};

export const MatrixRainBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = mediaQuery.matches;
    let animationFrameId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let cssWidth = 0;
    let cssHeight = 0;
    let fontSize = 18;
    let trailLength = 14;
    let columns: MatrixColumn[] = [];
    let lastTimestamp = 0;

    const configureCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      cssWidth = Math.max(1, Math.floor(rect.width));
      cssHeight = Math.max(1, Math.floor(rect.height));

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(cssWidth * pixelRatio);
      canvas.height = Math.floor(cssHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const layout = createMatrixColumnLayout(cssWidth, cssHeight);
      fontSize = layout.fontSize;
      trailLength = layout.trailLength;
      columns = layout.columns;
    };

    const drawFrame = (timestamp: number) => {
      if (timestamp - lastTimestamp < 66) {
        animationFrameId = window.requestAnimationFrame(drawFrame);
        return;
      }

      lastTimestamp = timestamp;
      context.clearRect(0, 0, cssWidth, cssHeight);

      for (const column of columns) {
        const headY = column.y;

        for (let trailIndex = 0; trailIndex < trailLength; trailIndex += 1) {
          const glyphY = headY - trailIndex * fontSize * 0.92;
          if (glyphY < -fontSize || glyphY > cssHeight + fontSize) {
            continue;
          }

          const isHeadGlyph = trailIndex === 0;
          const alphaValue = Math.max(0.08, 1 - trailIndex / trailLength);
          context.font = `${isHeadGlyph ? 800 : 700} ${fontSize}px SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.shadowBlur = isHeadGlyph ? 18 : 10;
          context.shadowColor = isHeadGlyph ? 'rgba(255,255,255,0.35)' : 'rgba(125,255,155,0.28)';
          context.fillStyle = isHeadGlyph
            ? `rgba(235,255,241,${Math.min(1, alphaValue + 0.14)})`
            : `rgba(125,255,155,${alphaValue})`;
          context.fillText(pickGlyph(column.seed + trailIndex + Math.floor(headY / fontSize)), column.x, glyphY);
        }

        if (!reduceMotion) {
          column.y += fontSize * column.speed;
          if (column.y - trailLength * fontSize > cssHeight + fontSize * 2) {
            column.y = -Math.random() * cssHeight * 0.4;
            column.seed += 17;
          }
        }
      }

      if (!reduceMotion) {
        animationFrameId = window.requestAnimationFrame(drawFrame);
      }
    };

    const startOrRedraw = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
      lastTimestamp = 0;
      configureCanvas();
      drawFrame(performance.now());
    };

    const handleMotionChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      startOrRedraw();
    };

    resizeObserver = new ResizeObserver(() => {
      startOrRedraw();
    });
    resizeObserver.observe(canvas);
    mediaQuery.addEventListener('change', handleMotionChange);
    startOrRedraw();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return (
    <Box
      aria-hidden="true"
      data-testid="matrix-rain-background"
      sx={(theme) => ({
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: theme.palette.mode === 'dark' ? 1 : 0.82,
      })}
    >
      <Box
        sx={(theme) => ({
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: `radial-gradient(circle at 50% 10%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06)} 0%, transparent 38%), linear-gradient(180deg, ${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.08 : 0.02)} 0%, ${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.22 : 0.08)} 32%, ${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.38 : 0.12)} 100%)`,
        })}
      />
      <Box
        component="canvas"
        ref={canvasRef}
        data-testid="matrix-rain-canvas"
        sx={(theme) => ({
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          width: '100%',
          height: '100%',
          maskImage: 'linear-gradient(180deg, transparent 0%, black 8%, black 88%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(180deg, transparent 0%, black 8%, black 88%, transparent 100%)',
          opacity: theme.palette.mode === 'dark' ? 0.95 : 0.84,
        })}
      />
      <Box
        sx={(theme) => ({
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          background: `linear-gradient(180deg, ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.04 : 0)} 0%, transparent 18%, transparent 72%, ${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.18 : 0.06)} 100%)`,
        })}
      />
    </Box>
  );
};