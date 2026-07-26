import Game from './game/Game';
import { ErrorBoundary } from './game/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Game />
    </ErrorBoundary>
  );
}
