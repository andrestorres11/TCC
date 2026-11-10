import { redirect } from 'next/navigation';

export default function Home() {
  // El middleware enruta a los usuarios autenticados según su rol.
  redirect('/login');
}
