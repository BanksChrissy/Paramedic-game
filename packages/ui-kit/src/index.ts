/**
 * Export simple UI primitives.  These placeholders exist so that other
 * packages can depend on a common UI library without pulling in any
 * implementation until later phases.  Actual components (buttons, steppers,
 * layout grids) will be added here over time.
 */

export function PlaceholderButton(props: React.PropsWithChildren<{}>): JSX.Element {
  return <button style={{ padding: '0.5rem 1rem' }}>{props.children}</button>;
}