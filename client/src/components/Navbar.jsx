import { ShoppingCart, UserPlus, LogIn, LogOut, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";

const Navbar = () => {
  const { user, logout } = useUserStore();
  const isAdmin = user?.role === "admin";
  const { cart } = useCartStore();
  return (
    <header className="fixed top-0 left-0 z-40 w-full transition-all duration-300 bg-ink/80 backdrop-blur-md border-b border-line/80 shadow-md">
      <div className="container px-4 py-3 mx-auto">
        <div className="flex flex-wrap items-center justify-between">
          <Link
            to="/"
            className="flex items-center space-x-2 text-2xl font-bold text-white hover:text-accent transition-colors"
          >
            CartFlow
          </Link>

          <nav className="flex flex-wrap items-center gap-4">
            <Link
              to={"/"}
              className="text-muted transition duration-300 ease-in-out hover:text-accent"
            >
              Home
            </Link>
            {user && (
              <Link
                to={"/cart"}
                className="relative text-muted transition duration-300 ease-in-out group hover:text-accent"
              >
                <ShoppingCart
                  className="inline-block mr-1 group-hover:text-accent"
                  size={20}
                />
                <span className="hidden sm:inline">Cart</span>
                {cart.length > 0 && (
                  <span
                    className="absolute -top-2 -left-2 bg-accent text-ink rounded-full px-2 py-0.5 
									text-xs group-hover:bg-accentSoft transition duration-300 ease-in-out"
                  >
                    {cart.length}
                  </span>
                )}
              </Link>
            )}
            {isAdmin && (
              <Link
                className="flex items-center px-3 py-1 font-medium text-ink transition duration-300 ease-in-out rounded-md bg-accent hover:bg-accentHover"
                to={"/secret-dashboard"}
              >
                <Lock className="inline-block mr-1" size={18} />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}

            {user ? (
              <button
                className="flex items-center px-4 py-2 text-white transition duration-300 ease-in-out bg-panelAlt rounded-md hover:bg-line"
                onClick={logout}
              >
                <LogOut size={18} />
                <span className="hidden ml-2 sm:inline">Log Out</span>
              </button>
            ) : (
              <>
                <Link
                  to={"/signup"}
                  className="flex items-center px-4 py-2 text-ink transition duration-300 ease-in-out rounded-md bg-accent hover:bg-accentHover"
                >
                  <UserPlus className="mr-2" size={18} />
                  Sign Up
                </Link>
                <Link
                  to={"/login"}
                  className="flex items-center px-4 py-2 text-white transition duration-300 ease-in-out bg-panelAlt rounded-md hover:bg-line"
                >
                  <LogIn className="mr-2" size={18} />
                  Login
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
