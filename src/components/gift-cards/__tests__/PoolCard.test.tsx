/**
 * PoolCard Component Tests
 * 
 * Tests for gift card pool card display component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PoolCard } from '../PoolCard';

describe('PoolCard', () => {
  const mockPool = {
    id: 'test-pool-1',
    pool_name: 'Amazon $50 Cards',
    brand_name: 'Amazon',
    card_value: 5000,
    total_cards: 1000,
    available_cards: 750,
    claimed_cards: 150,
    delivered_cards: 100,
    is_master_pool: false,
    created_at: '2024-01-01T00:00:00Z',
  };

  it('should render pool information', () => {
    render(<PoolCard pool={mockPool} onClick={() => {}} />);
    
    expect(screen.getByText('Amazon $50 Cards')).toBeInTheDocument();
    expect(screen.getByText(/750.*available/i)).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<PoolCard pool={mockPool} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    expect(handleClick).toHaveBeenCalledWith(mockPool.id);
  });

  it('should show master pool badge', () => {
    const masterPool = { ...mockPool, is_master_pool: true };
    render(<PoolCard pool={masterPool} onClick={() => {}} />);
    
    expect(screen.getByText(/master/i)).toBeInTheDocument();
  });

  it('should show low stock warning when available cards < 100', () => {
    const lowStockPool = { ...mockPool, available_cards: 50 };
    render(<PoolCard pool={lowStockPool} onClick={() => {}} />);
    
    expect(screen.getByText(/low stock/i)).toBeInTheDocument();
  });

  it('should format currency correctly', () => {
    render(<PoolCard pool={mockPool} onClick={() => {}} />);
    
    expect(screen.getByText(/\$50\.00/)).toBeInTheDocument();
  });
});
