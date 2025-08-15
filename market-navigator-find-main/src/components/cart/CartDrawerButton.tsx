import React, { useState } from 'react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import CartIcon from './CartIcon';
import CartDrawer from './CartDrawer';

const CartDrawerButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const isGuest = localStorage.getItem('isGuest') === 'true';
  
  const handleSignIn = () => {
    // Clear guest session data
    localStorage.removeItem('isGuest');
    localStorage.removeItem('guestUserId');
    
    // Navigate to auth page
    window.location.href = '/';
  };

  if (isGuest) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <CartIcon className="hover:bg-gray-100 rounded-full p-2" />
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Shopping Cart</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            {/* Lock icon */}
            <div className="flex justify-center">
              <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sign in to use cart
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Create an account or sign in to save items to your cart
              </p>
              <Button 
                onClick={handleSignIn}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Sign in to unlock
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <CartIcon className="hover:bg-gray-100 rounded-full p-2" />
      </SheetTrigger>
      <CartDrawer open={open} onOpenChange={setOpen} />
    </Sheet>
  );
};

export default CartDrawerButton;