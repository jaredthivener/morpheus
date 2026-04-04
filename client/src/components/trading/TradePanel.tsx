import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { memo, startTransition, useEffect, useRef, useState } from 'react';
import { fetchOrderBook, submitLimitOrder } from '../../api/client';
import { DashboardPanel, insetSurfaceSx } from '../common/DashboardPanel';
import { usePortfolioStore } from '../../store/portfolioStore';
import type { Quote } from '../../types/market';
import { formatQuoteFreshness } from '../../utils/marketSession';

interface TradePanelProps {
  quotes: Quote[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

type TradeSide = 'buy' | 'sell';
type OrderType = 'market' | 'limit';
type FlashState = {
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
};

export const ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS = 90;

const OrderTypeToggleGroup = memo(({
  committedOrderType,
  onChange,
}: {
  committedOrderType: OrderType;
  onChange: (nextType: OrderType | null) => void;
}) => {
  const [displayedOrderType, setDisplayedOrderType] = useState<OrderType>(committedOrderType);

  useEffect(() => {
    setDisplayedOrderType(committedOrderType);
  }, [committedOrderType]);

  return (
    <ToggleButtonGroup
      fullWidth
      exclusive
      value={displayedOrderType}
      onChange={(_, nextType: OrderType | null) => {
        if (!nextType) {
          return;
        }

        setDisplayedOrderType(nextType);
        onChange(nextType);
      }}
      size="small"
      color="primary"
    >
      <ToggleButton value="market" disableRipple>
        Market
      </ToggleButton>
      <ToggleButton value="limit" disableRipple>
        Limit
      </ToggleButton>
    </ToggleButtonGroup>
  );
});

OrderTypeToggleGroup.displayName = 'OrderTypeToggleGroup';

export const TradePanel = memo(({ quotes, selectedSymbol, onSelectSymbol }: TradePanelProps) => {
  const [shares, setShares] = useState(1);
  const [side, setSide] = useState<TradeSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [limitPrice, setLimitPrice] = useState(0);
  const [flash, setFlash] = useState<FlashState | null>(null);
  const pendingOrderTypeHandoffTimerRef = useRef<number | null>(null);

  const buy = usePortfolioStore((state) => state.buy);
  const sell = usePortfolioStore((state) => state.sell);
  const cash = usePortfolioStore((state) => state.cash);
  const position = usePortfolioStore((state) => state.holdings[selectedSymbol]);

  const selectedQuote = quotes.find((quote) => quote.symbol === selectedSymbol) ?? quotes[0];
  const symbol = selectedQuote?.symbol ?? '';
  const selectedPrice = selectedQuote?.price ?? 0;

  const orderBookQuery = useQuery({
    queryKey: ['order-book', symbol],
    queryFn: () => fetchOrderBook(symbol),
    refetchInterval: 4_000,
    enabled: symbol.length > 0,
  });

  const bestBid = orderBookQuery.data?.bids[0]?.price ?? selectedPrice;
  const bestAsk = orderBookQuery.data?.asks[0]?.price ?? selectedPrice;
  const spread = orderBookQuery.data?.spread ?? Math.max(0, bestAsk - bestBid);

  const bidLevels = (orderBookQuery.data?.bids ?? Array.from({ length: 3 }, () => ({ price: 0, size: 0 })))
    .slice(0, 3)
    .map((level, idx) => ({
      id: `bid-${idx}-${level.price}`,
      price: level.price,
      size: level.size,
    }));

  const askLevels = (orderBookQuery.data?.asks ?? Array.from({ length: 3 }, () => ({ price: 0, size: 0 })))
    .slice(0, 3)
    .map((level, idx) => ({
      id: `ask-${idx}-${level.price}`,
      price: level.price,
      size: level.size,
    }));

  useEffect(() => {
    if (selectedPrice > 0) {
      setLimitPrice(Number(selectedPrice.toFixed(2)));
    }
  }, [selectedPrice, symbol]);

  useEffect(() => {
    if (orderType === 'limit' && limitPrice <= 0 && selectedPrice > 0) {
      setLimitPrice(Number(selectedPrice.toFixed(2)));
    }
  }, [limitPrice, orderType, selectedPrice]);

  useEffect(() => {
    return () => {
      if (pendingOrderTypeHandoffTimerRef.current !== null) {
        window.clearTimeout(pendingOrderTypeHandoffTimerRef.current);
      }
    };
  }, []);

  const estimatedExecutionPrice =
    orderType === 'market' ? (side === 'buy' ? bestAsk : bestBid) : Math.max(limitPrice, 0);
  const estimatedNotional = shares * estimatedExecutionPrice;
  const currentShares = position?.shares ?? 0;
  const helperMessage = (() => {
    if (!symbol) {
      return 'Quotes are loading. The ticket will unlock as soon as the watchlist arrives.';
    }

    if (selectedPrice <= 0) {
      return 'Awaiting a tradable quote for this symbol.';
    }

    if (side === 'buy' && estimatedNotional > cash) {
      return `Insufficient cash for this order. Estimated cost ${estimatedNotional.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })}.`;
    }

    if (side === 'sell' && shares > currentShares) {
      return `Reduce size. You currently hold ${currentShares} share${currentShares === 1 ? '' : 's'} of ${symbol}.`;
    }

    return `${side === 'buy' ? 'Estimated cost' : 'Estimated proceeds'} ${estimatedNotional.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    })}.`;
  })();

  const canSubmit =
    symbol.length > 0 &&
    selectedPrice > 0 &&
    estimatedExecutionPrice > 0 &&
    !(side === 'buy' && estimatedNotional > cash) &&
    !(side === 'sell' && shares > currentShares);

  const sourceColor =
    selectedQuote?.source === 'live'
      ? 'success'
      : selectedQuote?.source === 'cached'
        ? 'warning'
        : 'default';
  const showLimitPrice = orderType === 'limit';

  const handleOrderTypeChange = (nextType: OrderType | null) => {
    if (!nextType) {
      return;
    }

    if (pendingOrderTypeHandoffTimerRef.current !== null) {
      window.clearTimeout(pendingOrderTypeHandoffTimerRef.current);
      pendingOrderTypeHandoffTimerRef.current = null;
    }

    if (nextType === orderType) {
      return;
    }

    pendingOrderTypeHandoffTimerRef.current = window.setTimeout(() => {
      pendingOrderTypeHandoffTimerRef.current = null;
      startTransition(() => {
        setOrderType(nextType);
      });
    }, ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS);
  };

  const submitTrade = async (): Promise<void> => {
    if (!canSubmit) {
      setFlash({ message: helperMessage, severity: 'warning' });
      return;
    }

    if (orderType === 'market') {
      const fillPrice = side === 'buy' ? bestAsk : bestBid;
      const ok = side === 'buy' ? buy(symbol, shares, fillPrice) : sell(symbol, shares, fillPrice);
      setFlash({
        message: ok
          ? `${side.toUpperCase()} market fill: ${shares} ${symbol} @ $${fillPrice.toFixed(2)}`
          : 'Trade rejected by risk rules.',
        severity: ok ? 'success' : 'warning',
      });
      return;
    }

    try {
      const result = await submitLimitOrder({
        symbol,
        side,
        shares,
        limitPrice,
      });

      if (result.filled && result.executedPrice !== null) {
        const ok =
          side === 'buy'
            ? buy(symbol, shares, result.executedPrice)
            : sell(symbol, shares, result.executedPrice);
        setFlash({
          message: ok
            ? `${side.toUpperCase()} limit filled @ $${result.executedPrice.toFixed(2)}.`
            : 'Order filled at venue but rejected by portfolio risk rules.',
          severity: ok ? 'success' : 'warning',
        });
      } else {
        setFlash({ message: `Limit pending: ${result.reason}`, severity: 'info' });
      }
    } catch (error: unknown) {
      setFlash({ message: `Limit order failed: ${String(error)}`, severity: 'error' });
    }
  };

  return (
    <DashboardPanel
      title="Paper Order Ticket"
      subtitle="Optional simulated execution once you are ready to test an idea."
      minHeight={0}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {[1, 5, 10, 25].map((preset) => (
            <Chip
              key={preset}
              label={`${preset} sh`}
              onClick={() => setShares(preset)}
              color={shares === preset ? 'primary' : 'default'}
              variant={shares === preset ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>

        <Stack
          sx={(theme) => ({
            ...insetSurfaceSx(theme),
            p: 1.75,
            borderColor: alpha(selectedQuote?.source === 'live' ? theme.palette.primary.main : theme.palette.divider, selectedQuote?.source === 'live' ? 0.28 : 0.9),
          })}
        >
          <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <div>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  Focused symbol
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {symbol || '--'}
                </Typography>
              </div>
              <Chip
                size="small"
                label={selectedQuote ? selectedQuote.source.toUpperCase() : 'AWAITING'}
                color={sourceColor}
                variant={selectedQuote?.source === 'live' ? 'filled' : 'outlined'}
              />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
              {selectedPrice > 0 ? `$${selectedPrice.toFixed(2)}` : '--'}
            </Typography>
            <Stack direction="row" spacing={1.25}>
              <Typography
                variant="body2"
                sx={{ color: (selectedQuote?.changePercent ?? 0) >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}
              >
                {selectedQuote
                  ? `${selectedQuote.changePercent >= 0 ? '+' : ''}${selectedQuote.changePercent.toFixed(2)}%`
                  : '--'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {selectedQuote ? formatQuoteFreshness(selectedQuote.asOf) : 'Awaiting quote'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {orderBookQuery.isFetching ? 'Refreshing book…' : 'Book live'}
              </Typography>
            </Stack>
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <ToggleButtonGroup
            fullWidth
            exclusive
            value={side}
            onChange={(_, nextSide: TradeSide | null) => {
              if (nextSide) {
                setSide(nextSide);
              }
            }}
            size="small"
            color="primary"
          >
            <ToggleButton value="buy" disableRipple>Buy</ToggleButton>
            <ToggleButton value="sell" disableRipple>Sell</ToggleButton>
          </ToggleButtonGroup>

          <OrderTypeToggleGroup committedOrderType={orderType} onChange={handleOrderTypeChange} />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <TextField
            select
            label="Symbol"
            value={symbol}
            onChange={(event) => onSelectSymbol(event.target.value)}
            size="small"
            sx={{ flex: 1 }}
          >
            {quotes.length === 0 ? (
              <MenuItem value="">Loading symbols…</MenuItem>
            ) : (
              quotes.map((quote) => (
                <MenuItem key={quote.symbol} value={quote.symbol}>
                  {quote.symbol}
                </MenuItem>
              ))
            )}
          </TextField>
          <TextField
            type="number"
            label="Shares"
            value={shares}
            inputProps={{ min: 1, step: 1 }}
            onChange={(event) => setShares(Math.max(1, Number(event.target.value) || 1))}
            size="small"
            sx={{ width: { sm: 132 } }}
          />
        </Stack>

        <Box data-testid="trade-limit-price-slot" aria-hidden={!showLimitPrice} sx={{ minHeight: 40 }}>
          <TextField
            type="number"
            label="Limit Price"
            value={limitPrice || selectedPrice}
            inputProps={{ min: 0.01, step: 0.01 }}
            onChange={(event) => setLimitPrice(Math.max(0.01, Number(event.target.value)))}
            size="small"
            fullWidth
            disabled={!showLimitPrice}
            sx={{
              visibility: showLimitPrice ? 'visible' : 'hidden',
              pointerEvents: showLimitPrice ? 'auto' : 'none',
            }}
          />
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <Stack sx={(theme) => ({ ...insetSurfaceSx(theme), flex: 1, p: 1.25 })}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Best bid
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.25, fontWeight: 700 }}>
              ${bestBid.toFixed(2)}
            </Typography>
          </Stack>
          <Stack sx={(theme) => ({ ...insetSurfaceSx(theme), flex: 1, p: 1.25 })}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Best ask
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.25, fontWeight: 700 }}>
              ${bestAsk.toFixed(2)}
            </Typography>
          </Stack>
          <Stack sx={(theme) => ({ ...insetSurfaceSx(theme), flex: 1, p: 1.25 })}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Spread
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.25, fontWeight: 700 }}>
              ${spread.toFixed(2)}
            </Typography>
          </Stack>
        </Stack>

        <Button variant="contained" onClick={() => void submitTrade()} disabled={!canSubmit}>
          {orderType === 'market'
            ? `${side === 'buy' ? 'Buy' : 'Sell'} ${shares} at Market`
            : `Place ${side === 'buy' ? 'Buy' : 'Sell'} Limit`}
        </Button>

        <Alert severity={canSubmit ? 'info' : 'warning'} variant="outlined">
          {helperMessage}
        </Alert>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Current position: {currentShares} share{currentShares === 1 ? '' : 's'}
          {position ? ` • Avg cost $${position.avgCost.toFixed(2)}` : ' • No open exposure yet'}
        </Typography>

        <Stack direction="row" spacing={2}>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
              Top Bids
            </Typography>
            {bidLevels.map((level) => (
              <Typography key={level.id} variant="caption" sx={{ minHeight: 18, color: 'text.secondary' }}>
                {level.price > 0 ? `${level.size} @ $${level.price.toFixed(2)}` : '--'}
              </Typography>
            ))}
          </Stack>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 700 }}>
              Top Asks
            </Typography>
            {askLevels.map((level) => (
              <Typography key={level.id} variant="caption" sx={{ minHeight: 18, color: 'text.secondary' }}>
                {level.price > 0 ? `${level.size} @ $${level.price.toFixed(2)}` : '--'}
              </Typography>
            ))}
          </Stack>
        </Stack>
        {flash ? <Alert severity={flash.severity}>{flash.message}</Alert> : null}
      </Stack>
    </DashboardPanel>
  );
});

TradePanel.displayName = 'TradePanel';
