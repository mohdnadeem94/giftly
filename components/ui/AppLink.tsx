"use client";

import NextLink from "next/link";
import MuiLink, { type LinkProps } from "@mui/material/Link";

export default function AppLink({ href, ...props }: LinkProps & { href: string }) {
  return <MuiLink component={NextLink} href={href} {...props} />;
}
