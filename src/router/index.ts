import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'characters' },
    },
    {
      path: '/characters',
      name: 'characters',
      component: () => import('../views/CharacterBoardView.vue'),
    },
    {
      path: '/characters/features',
      name: 'character-features',
      component: () => import('../views/CharacterFeaturesView.vue'),
    },
    {
      path: '/characters/spells',
      name: 'character-spells',
      component: () => import('../views/CharacterSpellsView.vue'),
    },
    {
      path: '/characters/new',
      name: 'character-create',
      component: () => import('../views/CharacterCreateView.vue'),
    },
  ],
})

export default router
