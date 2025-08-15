import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';

interface CartIconProps {
  className?: string;
  onClick?: () => void;
}

const CartIcon = React.forwardRef<HTMLButtonElement, CartIconProps>(({ className, onClick }, ref) => {
  const { getCartCount } = useCart();
  const itemCount = getCartCount();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={onClick}
      aria-label={`Shopping cart with ${itemCount} items`}
      ref={ref}
    >
      <div className="relative">
        <ShoppingCart className="h-8 w-8" />
        {itemCount > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 px-2 py-1 min-w-[1.75rem] h-6 flex items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold"
          >
            {itemCount}
          </Badge>
        )}
      </div>
    </Button>
  );
});

CartIcon.displayName = 'CartIcon';

export default CartIcon;