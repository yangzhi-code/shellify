import { createRouter, createWebHistory } from 'vue-router';
import Terminal from '@renderer/components/Terminal.vue';

const routes = [
  { path: '/', component: Terminal },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;