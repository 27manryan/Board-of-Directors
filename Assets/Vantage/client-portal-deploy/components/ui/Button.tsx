import { forwardRef } from "react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-navy text-cream-100 hover:bg-navy-light focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1",
  ghost:
    "bg-transparent text-navy border-b border-navy hover:border-gold hover:text-gold",
  outline:
    "bg-transparent text-navy border border-navy hover:bg-navy hover:text-cream-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-5 py-2 text-[10px]",
  md: "px-8 py-3 text-xs",
  lg: "px-10 py-4 text-sm",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center font-medium uppercase tracking-widest transition-colors duration-150 cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 border border-current border-t-transparent animate-spin" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
