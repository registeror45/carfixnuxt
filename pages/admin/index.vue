<script lang="ts" setup>
import { ref } from 'vue';
import axios from 'axios';

const { public: { apiBaseUrl } } = useRuntimeConfig()
const form = ref({
  login: '',
  password: '',
});

const errorMessage = ref('');

const handleSubmit = async () => {
  try {
    const response = await axios.post(`${apiBaseUrl}/api/admins/login`, form.value, {
      withCredentials: true,
    });

    if (response.data.success) {
      if (response.data.role === 'sAdmin') {
        window.location.href = '/admin/sAdmin'; // Перенаправляем на страницу sAdmin
      } else if (response.data.role === 'yAdmin') {
        window.location.href = '/admin/yAdmin'; // Перенаправляем на страницу yAdmin
      }
    } else {
      errorMessage.value = response.data.message;
    }
  } catch (error) {
    errorMessage.value = 'Ошибка при входе';
  }
};
</script>
<template>
    <NuxtLink to="/"><button class="logout-class">Перейти на главную страницу</button></NuxtLink>
    <div class="login-container">
      <form @submit.prevent="handleSubmit" class="login-form">
        <h2 class="form-title">Вход</h2>
  
        <div class="form-group">
          <label for="username" class="form-label">Имя пользователя:</label>
          <input
            type="text"
            id="username"
            v-model="form.login"
            class="form-input"
            placeholder="Введите имя пользователя"
            required
          />
        </div>
  
        <div class="form-group">
          <label for="password" class="form-label">Пароль:</label>
          <input
            type="password"
            id="password"
            v-model="form.password"
            class="form-input"
            placeholder="Введите пароль"
            required
          />
        </div>
  
        <button type="submit" class="submit-button">Войти</button>
  
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </form>
    </div>
  </template>
  
  