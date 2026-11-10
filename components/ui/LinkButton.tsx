"use client";

// MUI Button that navigates with Next.js client-side routing.
// Lives in a client file so server components can use it without passing functions across the boundary.
import NextLink from "next/link";
import Button, { type ButtonProps } from "@mui/material/Button";

export default function LinkButton({ href, ...props }: ButtonProps & { href: string }) {
  return <Button component={NextLink} href={href} {...props} />;
}
