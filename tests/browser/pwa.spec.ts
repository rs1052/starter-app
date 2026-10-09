import { expect, test } from "@playwright/test";

test("shared shell provides the manifest and install icons", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon.png",
  );

  const response = await page.request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest: unknown = await response.json();
  const icons = [
    {
      src: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];
  expect(manifest).toMatchObject({
    name: "Hono starter",
    short_name: "Hono starter",
    start_url: "/",
    scope: "/",
    display: "standalone",
    icons,
  });

  for (const src of [
    ...icons.map((icon) => icon.src),
    "/icons/apple-touch-icon.png",
  ]) {
    const icon = await page.request.get(src);
    expect(icon.ok(), src).toBe(true);
    expect(icon.headers()["content-type"], src).toContain("image/png");
  }
});
