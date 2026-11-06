export const prerender = false;

export function GET({ url }) {
  const name = url.searchParams.get('name')?.trim() || 'world';
  return Response.json({ message: `Hello, ${name}!`, framework: 'Astro' });
}
