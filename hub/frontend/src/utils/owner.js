// Dono do painel de acessos. A trava real fica no backend; aqui so esconde o menu.
export const OWNER_EMAIL = 'jonasbrito1a@gmail.com'

export function isOwner(user) {
  return (user?.email || '').trim().toLowerCase() === OWNER_EMAIL
}
