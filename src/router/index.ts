import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
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
      path: '/characters/resources',
      name: 'character-resources',
      component: () => import('../views/CharacterResourcesView.vue'),
    },
    {
      path: '/characters/items',
      name: 'character-items',
      component: () => import('../views/CharacterItemsView.vue'),
    },
    {
      path: '/characters/adventure-logs',
      name: 'character-adventure-logs',
      component: () => import('../views/CharacterAdventureLogsView.vue'),
    },
    {
      path: '/characters/creatures',
      name: 'character-creatures',
      component: () => import('../views/CharacterCreaturesView.vue'),
    },
    {
      path: '/characters/new',
      name: 'character-create',
      component: () => import('../views/CharacterCreateView.vue'),
    },
  ],
})

export default router
