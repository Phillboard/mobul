/**
 * CampaignCard Component Tests
 * 
 * Tests for campaign card display component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CampaignCard } from '../CampaignCard';
import { BrowserRouter } from 'react-router-dom';

describe('CampaignCard', () => {
  const mockCampaign = {
    id: 'test-campaign-1',
    name: 'Spring Sale 2024',
    status: 'active' as const,
    mail_date: '2024-03-15',
    size: '6x9' as const,
    created_at: '2024-01-01T00:00:00Z',
    client_id: 'client-1',
    audience: {
      name: 'VIP Customers',
      total_count: 1000,
    },
  };

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('should render campaign information', () => {
    renderWithRouter(<CampaignCard campaign={mockCampaign} />);
    
    expect(screen.getByText('Spring Sale 2024')).toBeInTheDocument();
    expect(screen.getByText(/VIP Customers/)).toBeInTheDocument();
    expect(screen.getByText(/1,000/)).toBeInTheDocument();
  });

  it('should display correct status badge', () => {
    renderWithRouter(<CampaignCard campaign={mockCampaign} />);
    
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('should show mail date', () => {
    renderWithRouter(<CampaignCard campaign={mockCampaign} />);
    
    expect(screen.getByText(/Mar 15, 2024/)).toBeInTheDocument();
  });

  it('should show draft status for campaigns without mail date', () => {
    const draftCampaign = { ...mockCampaign, mail_date: null, status: 'draft' as const };
    renderWithRouter(<CampaignCard campaign={draftCampaign} />);
    
    expect(screen.getByText(/draft/i)).toBeInTheDocument();
  });
});
