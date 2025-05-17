<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import axios from 'axios';
import 'cleave.js/dist/addons/cleave-phone.ru'; // Для поддержки русского формата
const { public: { apiBaseUrl } } = useRuntimeConfig()
// Функция для форматирования числа в формат 99.999,00
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(price)
    .replace(/\s/g, '.'); // Заменяем пробелы на точки
};
// Проверка токена при загрузке страницы
onMounted(async () => {
  try {
    const response = await axios.get(`${apiBaseUrl}/api/admins/check-auth`, {
      withCredentials: true, // Убедитесь, что withCredentials: true
    });
    console.log('Ответ от сервера при проверке авторизации', response.data);
    if (!response.data.success || response.data.role !== 'sAdmin') {
      window.location.href = '/admin'; // Перенаправляем на страницу авторизации
    }
  } catch (error) {
    console.error('Ошибка при проверке авторизации', error);
    window.location.href = '/admin'; // Перенаправляем на страницу авторизации
  }
});

// Интерфейс для товара
interface Product {
  _id: string;
  'product-name': string;
  'product-price': number; // Теперь product-price имеет тип number
  'product-image': string;
}

// Состояния для пагинации и товаров
const currentPage = ref(0);
const itemsPerPage = ref(15); // Количество товаров на одной странице
const products = ref<Product[]>([]); // Товары из MongoDB
const searchQuery = ref(''); // Состояние для хранения текста поиска

// Функция для обновления itemsPerPage в зависимости от ширины экрана
const updateItemsPerPage = () => {
  const width = window.innerWidth;
  if (width <= 1023) {
    itemsPerPage.value = 6;
  } else if (width <= 1279) {
    itemsPerPage.value = 9;
  } else if (width <= 1539) {
    itemsPerPage.value = 12;
  } else {
    itemsPerPage.value = 15;
  }
};

// Вызов функции при монтировании компонента
onMounted(() => {
  updateItemsPerPage();
  window.addEventListener('resize', updateItemsPerPage);
});

// Удаление обработчика при уничтожении компонента
onUnmounted(() => {
  window.removeEventListener('resize', updateItemsPerPage);
});

// Следим за изменением itemsPerPage и обновляем слайдер
watch(itemsPerPage, () => {
  updateSlider();
});

// Загрузка всех товаров
const fetchAllProducts = async () => {
  try {
    const response = await axios.get(`${apiBaseUrl}/api/products`);
    products.value = response.data;
    console.log('Все товары загружены:', products.value);
    updateSlider(); // Обновляем слайдер
  } catch (error) {
    console.error('Ошибка при загрузке всех товаров:', error);
  }
};

// Поиск товаров по названию
const searchProducts = async () => {
  try {
    const response = await axios.get(`${apiBaseUrl}/api/products/search/${searchQuery.value}`);
    products.value = response.data; // Обновляем список товаров
    currentPage.value = 0; // Сбрасываем страницу на первую
    updateSlider(); // Обновляем слайдер
  } catch (error) {
    console.error('Ошибка при поиске товаров:', error);
  }
};

// Отслеживание изменения поискового запроса
watch(searchQuery, (newQuery) => {
  if (newQuery.trim() === '') {
    // Если поисковый запрос пуст, загружаем все товары
    fetchAllProducts();
  } else {
    // Иначе выполняем поиск
    searchProducts();
  }
});

// Вычисляем общее количество страниц
const totalPages = computed(() => Math.ceil(products.value.length / itemsPerPage.value));

// Функция для получения товаров для текущей страницы
const getProductsForPage = (page: number) => {
  const start = page * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return products.value.slice(start, end);
};

// Функция для обновления слайдера
const updateSlider = () => {
  const pages = document.querySelectorAll('.page');
  pages.forEach((page, index) => {
    if (index === currentPage.value) {
      page.classList.add('active');
    } else {
      page.classList.remove('active');
    }
  });

  // Обновляем состояние кнопок навигации и поле ввода
  updateNavigationButtons();
  updatePageInput();
};

// Функция для обновления состояния кнопок навигации
const updateNavigationButtons = () => {
  const prevButton = document.querySelector('.nav-btn.prev') as HTMLButtonElement;
  const nextButton = document.querySelector('.nav-btn.next') as HTMLButtonElement;

  if (prevButton && nextButton) {
    // Если текущая страница первая, отключаем кнопку "Назад"
    if (currentPage.value === 0) {
      prevButton.disabled = true;
      prevButton.style.backgroundColor = 'gray';
    } else {
      prevButton.disabled = false;
      prevButton.style.backgroundColor = 'red';
    }

    // Если текущая страница последняя, отключаем кнопку "Вперед"
    if (currentPage.value === totalPages.value - 1) {
      nextButton.disabled = true;
      nextButton.style.backgroundColor = 'gray';
    } else {
      nextButton.disabled = false;
      nextButton.style.backgroundColor = 'red';
    }
  }
};

// Функция для обновления значения поля ввода
const updatePageInput = () => {
  const pageInput = document.querySelector('.page-input') as HTMLInputElement;
  if (pageInput) {
    pageInput.value = (currentPage.value + 1).toString();
    pageInput.style.backgroundColor = ''; // Сбрасываем цвет фона
  }
};

// Функция для перехода на страницу по введенному номеру
const goToPage = () => {
  const pageInput = document.querySelector('.page-input') as HTMLInputElement;
  if (pageInput) {
    const pageNumber = parseInt(pageInput.value, 10) - 1; // Преобразуем в индекс (начинается с 0)
    if (pageNumber >= 0 && pageNumber < totalPages.value) {
      const slides = document.querySelector('.slides') as HTMLElement;
      const pages = document.querySelectorAll('.page');
      const pageWidth = pages[0].clientWidth;

      // Вычисляем разницу между текущей и целевой страницей
      const pageDifference = Math.abs(currentPage.value - pageNumber);

      // Устанавливаем длительность анимации в зависимости от разницы
      const animationDuration = Math.min(0.5 + pageDifference * 0.2, 3); // Максимум 3 секунды
      slides.style.transition = `transform ${animationDuration}s ease-in-out`;

      // Переходим на указанную страницу
      currentPage.value = pageNumber;
      slides.style.transform = `translateX(-${currentPage.value * pageWidth}px)`;

      // Обновляем слайдер после смены страницы
      updateSlider();
    } else {
      // Если страница не существует, меняем цвет фона поля ввода
      pageInput.style.backgroundColor = '#ffcccc'; // Светло-красный цвет
    }
  }
};

// Функция для пересчета позиции слайдов при изменении размера окна
const handleResize = () => {
  const slides = document.querySelector('.slides') as HTMLElement;
  const pages = document.querySelectorAll('.page');
  const pageWidth = pages[0].clientWidth;

  // Временно отключаем анимацию
  slides.style.transition = 'none';

  // Пересчитываем позицию слайдов
  slides.style.transform = `translateX(-${currentPage.value * pageWidth}px)`;

  // Возвращаем анимацию после обновления позиции
  setTimeout(() => {
    slides.style.transition = ''; // Возвращаем анимацию
  }, 0);
};

// Функция для изменения страницы
const changePage = (direction: 'prev' | 'next') => {
  const slides = document.querySelector('.slides') as HTMLElement;
  const pages = document.querySelectorAll('.page');
  const pageWidth = pages[0].clientWidth;

  if (direction === 'prev' && currentPage.value > 0) {
    currentPage.value -= 1;
  } else if (direction === 'next' && currentPage.value < totalPages.value - 1) {
    currentPage.value += 1;
  }

  // Обновляем позицию слайдера
  slides.style.transform = `translateX(-${currentPage.value * pageWidth}px)`;

  // Обновляем слайдер после смены страницы
  updateSlider();
};

// Инициализация слайдера при монтировании компонента
onMounted(() => {
  fetchAllProducts();
  window.addEventListener('resize', handleResize);
});

// Удаляем обработчик события resize при уничтожении компонента
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

interface Category {
  _id: string;
  'categories-name': string;
}

// Реактивные данные
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const newCategoryName = ref('');
const categories = ref<Category[]>([]);
const categoryToDelete = ref<Category | null>(null);
const hoveredCategoryIndex = ref<number | null>(null);

// Получить список категорий
const fetchCategories = async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/categories`);
    const data = await response.json();
    categories.value = data;
  } catch (error) {
    console.error('Ошибка при получении категорий:', error);
  }
};

// Добавить категорию
const addCategory = async () => {
  if (!newCategoryName.value.trim()) {
    alert('Пожалуйста, введите название категории.');
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 'categories-name': newCategoryName.value.trim() }),
    });

    if (response.ok) {
      await fetchCategories();
      closeAddModal();
    } else {
      alert('Ошибка при добавлении категории');
    }
  } catch (error) {
    console.error('Ошибка при добавлении категории:', error);
  }
};

// Удалить категорию
const deleteCategory = async () => {
  if (!categoryToDelete.value) return;

  try {
    const response = await fetch(`${apiBaseUrl}/api/categories/${categoryToDelete.value._id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await fetchCategories();
      closeDeleteModal();
    } else {
      alert('Ошибка при удалении категории');
    }
  } catch (error) {
    console.error('Ошибка при удалении категории:', error);
  }
};

// Открыть модальное окно удаления
const openDeleteModal = (category: Category, index: number) => {
  if (category['categories-name'] === 'Все') {
    return; // Не открываем модальное окно для категории "Все"
  }
  categoryToDelete.value = category;
  showDeleteModal.value = true;
};

// Закрыть модальное окно добавления
const closeAddModal = () => {
  showAddModal.value = false;
  newCategoryName.value = '';
};

// Закрыть модальное окно удаления
const closeDeleteModal = () => {
  showDeleteModal.value = false;
  categoryToDelete.value = null;
};

// Загрузить категории при монтировании компонента
onMounted(() => {
  fetchCategories();
});

const handleLogout = async () => {
  try {
    await axios.post(`${apiBaseUrl}/api/admins/logout`, {}, {
      withCredentials: true,
    });
    window.location.href = '/admin'; // Перенаправляем на страницу авторизации
  } catch (error) {
    console.error('Ошибка при выходе из системы', error);
  }
};

</script>

<template>
  <button @click="handleLogout" class="logout-class">Выйти</button>
  <div class="CategoriesBody">
    <!-- Контейнер для кнопок и категорий, выровненный по вертикали -->
    <div class="vertical-container">
      <div class="button-container">
        <NuxtLink to="/admin/sAdmin/admin-product">
          <button class="add-button">Добавить товар</button>
        </NuxtLink>
        <button class="add-button" @click="showAddModal = true">Добавить категорию</button>
      </div>
      <!-- Поле поиска -->
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск товаров..."
          class="search-input search-sAdmin"
        />
      </div>
      <!-- Список категорий -->
      <div class="CategoriesCenter">
        <div class="Categories" id="section1">
          <!-- Отображаем каждую категорию из списка categories -->
          <div
            class="Сategory"
            v-for="(category, index) in categories"
            :key="index"
            @click="openDeleteModal(category, index)"
            @mouseover="hoveredCategoryIndex = index"
            @mouseleave="hoveredCategoryIndex = null"
            :style="{ border: hoveredCategoryIndex === index && category['categories-name'] !== 'Все' ? '2px solid red' : 'none' }"
          >
            <a style="text-decoration: none; color: black;">{{ category['categories-name'] }}</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно для добавления категории -->
    <div v-if="showAddModal" class="modal-overlay-addCategory">
      <div class="modal-content-addCategory">
        <h3>Введите название категории:</h3>
        <input v-model="newCategoryName" type="text" placeholder="Название категории" class="modal-input-addCategory" />
        <div class="modal-buttons-addCategory">
          <button class="modal-button-addCategory add" @click="addCategory">Добавить</button>
          <button class="modal-button-addCategory cancel" @click="closeAddModal">Отмена</button>
        </div>
      </div>
    </div>

    <!-- Модальное окно для удаления категории -->
    <div v-if="showDeleteModal" class="modal-overlay-deleteCategory">
      <div class="modal-content-deleteCategory">
        <h3 v-if="categoryToDelete">Вы действительно хотите удалить категорию: "{{ categoryToDelete['categories-name'] }}"?</h3>
        <div class="modal-buttons-deleteCategory">
          <button class="modal-button-deleteCategory delete" @click="deleteCategory">Удалить</button>
          <button class="modal-button-deleteCategory cancel" @click="closeDeleteModal">Отмена</button>
        </div>
      </div>
    </div>
  </div>
  <!-- Слайдер с товарами -->
  <div class="slider">
    <div class="slides">
    <!-- Динамически создаем слайды на основе количества страниц -->
    <div v-for="page in totalPages" :key="page" class="page" :class="{ active: currentPage === page - 1 }">
      <div class="container">
        <!-- Отображаем товары для текущей страницы -->
        <div class="item" v-for="(item, index) in getProductsForPage(page - 1)" :key="index">
          <div class="ProductPreview">
            <NuxtLink :to="`/admin/sAdmin/admin-product/${item._id}`">
              <img :src="item['product-image']" style="width:100%; height:100%;" />
            </NuxtLink>
          </div>
          <div class="ProductName">{{ item['product-name'] }}</div>
          <div class="Price">{{ formatPrice(item['product-price']) }} р<p class="quantity">/1шт</p></div>
          <div class="ProductButton"><NuxtLink :to="`/admin/sAdmin/admin-product/${item._id}`"><button class="ProductBtn">Изменить товар</button></NuxtLink></div>
        </div>
      </div>
    </div>
  </div>

    <!-- Контейнер для кнопок навигации и поля ввода -->
    <div class="navigation">
      <button class="nav-btn prev" @click="changePage('prev')">&lt;</button>
      <input
        class="page-input"
        type="number"
        :value="currentPage + 1"
        @input="goToPage"
        @keyup.enter="goToPage"
        min="1"
        :max="totalPages"
      />
      <button class="nav-btn next" @click="changePage('next')">&gt;</button>
    </div>
  </div>
</template>