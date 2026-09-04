import { useAuth } from './AuthContext';
import Login from './Login';
import MapView from './MapView';

export default function App() {
  const { user } = useAuth();

  if (user === undefined) {
    return <div className="loading-screen">Cargando…</div>;
  }

  return user ? <MapView /> : <Login />;
}
