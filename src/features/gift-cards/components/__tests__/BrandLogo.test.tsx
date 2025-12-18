/**
 * BrandLogo Component Tests
 * Tests the multi-source logo fallback functionality
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrandLogo } from '../BrandLogo';

describe('BrandLogo', () => {
  it('should render brand initials as fallback', () => {
    render(<BrandLogo brandName="Starbucks" logoUrl={null} />);
    expect(screen.getByText('ST')).toBeInTheDocument();
  });

  it('should render two-letter initials for multi-word brands', () => {
    render(<BrandLogo brandName="Jimmy Johns" logoUrl={null} />);
    expect(screen.getByText('JJ')).toBeInTheDocument();
  });

  it('should render single-word brand with two letters', () => {
    render(<BrandLogo brandName="Amazon" logoUrl={null} />);
    expect(screen.getByText('AM')).toBeInTheDocument();
  });

  it('should attempt to load image when logoUrl is provided', () => {
    const { container } = render(
      <BrandLogo 
        brandName="Starbucks" 
        logoUrl="https://example.com/logo.png" 
      />
    );
    
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src');
  });

  it('should use website URL to generate logo sources', () => {
    const { container } = render(
      <BrandLogo 
        brandName="Starbucks" 
        logoUrl={null}
        brandWebsite="starbucks.com"
      />
    );
    
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    // Should try Google favicons with the domain
    expect(img?.src).toContain('starbucks.com');
  });

  it('should handle different sizes', () => {
    const { container, rerender } = render(
      <BrandLogo brandName="Test" logoUrl={null} size="xs" />
    );
    
    expect(container.firstChild).toHaveClass('w-6', 'h-6');
    
    rerender(<BrandLogo brandName="Test" logoUrl={null} size="xl" />);
    expect(container.firstChild).toHaveClass('w-16', 'h-16');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <BrandLogo 
        brandName="Test" 
        logoUrl={null} 
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show loading state before image loads', async () => {
    const { container } = render(
      <BrandLogo 
        brandName="Starbucks" 
        logoUrl="https://example.com/logo.png" 
      />
    );
    
    const img = container.querySelector('img');
    expect(img).toHaveClass('opacity-0');
  });
});
