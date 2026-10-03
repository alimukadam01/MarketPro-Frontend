import React from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function DynamicBreadCrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  // A screen reached from somewhere else describes the route the user took, not
  // its own URL. Opening a customer from the ledgers list reads
  // "Home / accounting / ledgers / view customer", because that is where Back
  // goes and where they think they are - "Home / customers / view customer"
  // would name a list they never visited.
  //
  // `from` is set by whoever navigated here, the same value the back arrow uses.
  // Only the final segment of the real path is kept: the trail in front of it is
  // the origin's, so every link in it resolves.
  const from = location.state?.from;
  const pathnames = from
    ? [...from.split("/").filter(Boolean), segments[segments.length - 1]].filter(Boolean)
    : segments;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Home link */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathnames.map((name, index) => {
          const href = "/" + pathnames.slice(0, index + 1).join("/");
          const isLast = index === pathnames.length - 1;

          return (
            <React.Fragment key={href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>
                    {decodeURIComponent(name).replace(/-/g, " ")}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={href}>
                      {decodeURIComponent(name).replace(/-/g, " ")}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}