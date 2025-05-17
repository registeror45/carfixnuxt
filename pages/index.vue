<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import 'cleave.js/dist/addons/cleave-phone.ru'; // Для поддержки русского формата

const isModalOpen = ref(false);
const closeModal = () => {
  isModalOpen.value = false;
};

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

interface Product {
  _id: string;
  'product-name': string;
  'product-price': number; // Изменено на number
  'product-image': string;
  'product-category': string; // Это поле ссылается на _id категории
}

// Интерфейс для товара в корзине
interface BasketItem {
  _id: string;
  'items-product-name': string;
  'items-price': number; // Изменено на number
  'items-quantity': number;
  'items-product-image': string;
}

const { public: { apiBaseUrl } } = useRuntimeConfig()
const isEmailValid = ref<boolean>(true); // Состояние для валидности email
const emptyFieldsError = ref<string | null>(null); // Состояние для ошибки незаполненных полей
const modalContent = ref<HTMLElement | null>(null);
const currentPage = ref(0);
const itemsPerPage = ref(15);
const products = ref<Product[]>([]);
const selectedCategory = ref<string | null>(null);
const emailError = ref<string | null>(null); // Состояние для ошибки email
const basket = ref<BasketItem[]>([]); // Теперь корзина использует интерфейс BasketItem
const isOrderSuccessModalOpen = ref(false); // Состояние для модального окна с подтверждением заказа
const orderNumber = ref<string | null>(null); // Номер заказа
const phoneError = ref<string | null>(null);
const activeOrderError = ref<string | null>(null);

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

// Функция для проверки номера телефона
const validatePhoneNumber = (phone: string): boolean => {
  // Удаляем все нецифровые символы
  const cleaned = phone.replace(/\D/g, '');

  // Проверяем, что номер содержит 11 цифр
  if (cleaned.length !== 11) {
    phoneError.value = 'Не допустимый формат номера телефона';
    return false;
  }

  phoneError.value = null;
  return true;
};

// Следим за изменением emptyFieldsError
watch(emptyFieldsError, (newError) => {
  if (modalContent.value) {
    if (newError) {
      // Если есть ошибка, добавляем класс для увеличения высоты
      modalContent.value.classList.add('with-error');
    } else {
      // Если ошибки нет, убираем класс
      modalContent.value.classList.remove('with-error');
    }
  }
});

// Следим за изменением emailError
watch(emailError, (newError) => {
  if (modalContent.value) {
    if (newError) {
      // Если есть ошибка, добавляем класс для увеличения высоты
      modalContent.value.classList.add('with-error');
    } else {
      // Если ошибки нет, убираем класс
      modalContent.value.classList.remove('with-error');
    }
  }
});

// Функция для загрузки всех товаров
const fetchAllProducts = async () => {
  try {
    console.log('Отправляем запрос по URL:', `${apiBaseUrl}/api/products`);
    const response = await axios.get(`${apiBaseUrl}/api/products`);
    products.value = response.data;
    console.log('Все товары загружены:', products.value);
    updateNavigationButtons(); // Обновляем кнопки навигации
    updateSlider(); // Обновляем слайдер
  } catch (error) {
    console.error('Ошибка при загрузке всех товаров:', error);
  }
};

// Функция для получения или создания userId
const getOrCreateUserId = () => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('userId', userId);
    }
    return userId;
};

// Функция для загрузки товаров по категории
const fetchProductsByCategory = async (categoryId: string) => {
  try {
    console.log('Запрашиваемые данные по категории:', categoryId); // Отладка

    // Формируем правильный URL
    const url = `${apiBaseUrl}/api/products/category/${categoryId}`;
    console.log('Запрос по URL:', url); // Отладка

    const response = await axios.get(url);
    products.value = response.data; // Обновляем список товаров
    console.log('Товары загружены по категории:', products.value);
    updateNavigationButtons(); // Обновляем кнопки навигации
  } catch (error) {
    console.error('Ошибка при загрузке товаров по категории:', error);
  }
  updateNavigationButtons(); // Обновляем кнопки навигации
  updateSlider(); // Обновляем слайдер
};

/// Функция для выбора категории
const selectCategory = (categoryId: string, categoryName: string) => {
  if (!categoryId) {
    console.error('categoryId не передан');
    return;
  }

  selectedCategory.value = categoryId;
  currentPage.value = 0; // Сбрасываем страницу на первую при смене категории

  if (categoryName === 'Все') {
    fetchAllProducts(); // Загружаем все товары, если выбрана категория "Все"
  } else {
    fetchProductsByCategory(categoryId); // Загружаем товары по выбранной категории
  }
  updateSlider();
};

// Загрузка всех товаров при монтировании компонента
onMounted(() => {
  fetchAllProducts();
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
  const slides = document.querySelector('.slides') as HTMLElement;
  const pages = document.querySelectorAll('.page');
  if (pages.length > 0) {
    const pageWidth = pages[0].clientWidth;
    slides.style.transform = `translateX(-${currentPage.value * pageWidth}px)`;
  }

  // Обновляем активные страницы и кнопки навигации
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
      const animationDuration = Math.min(0.5 + pageDifference * 0.2, 3); // Максимум 2 секунды
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


onMounted(() => {
  // Инициализация слайдера
  updateSlider();

  // Добавляем обработчик события resize
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // Удаляем обработчик события resize при уничтожении компонента
  window.removeEventListener('resize', handleResize);
});

// Добавление товара в корзину
const addToBasket = async (product: Product) => {
    const userId = getOrCreateUserId();
    try {
        await axios.post(`${apiBaseUrl}/api/baskets/add`, {
            userId,
            'items-product-name': product['product-name'],
            'items-quantity': 1,
            'items-price': product['product-price'], // Теперь price - число
            'items-product-image': product['product-image'],
        });
        fetchBasket(); // Обновляем корзину после добавления товара
    } catch (error) {
        console.error('Ошибка при добавлении товара в корзину:', error);
    }
};

// Получение корзины пользователя
const fetchBasket = async () => {
    const userId = getOrCreateUserId();
    try {
        const response = await axios.get(`${apiBaseUrl}/api/baskets/${userId}`);
        basket.value = response.data.items;
    } catch (error) {
        console.error('Ошибка при получении корзины:', error);
    }
};

onMounted(() => {
    fetchBasket();
});

// Обновление количества товара в корзине
const updateQuantity = async (productName: string, quantity: number) => {
    if (quantity < 1) {
        quantity = 1; // Не позволяем количеству быть меньше 1
    }

    const userId = getOrCreateUserId();
    try {
        await axios.put(`${apiBaseUrl}/api/baskets/update`, { 
            userId, 
            'items-product-name': productName, 
            'items-quantity': quantity 
        });
        fetchBasket(); // Обновляем корзину после изменения количества
    } catch (error) {
        console.error('Ошибка при обновлении количества товара:', error);
    }
};

// Поле ввода кол-во товара
const handleQuantityChange = async (productName: string, event: Event) => {
    const input = event.target as HTMLInputElement;
    const newQuantity = parseInt(input.value, 10);

    if (isNaN(newQuantity) || newQuantity < 1) {
        // Если введено некорректное значение, устанавливаем количество равным 1
        input.value = '1';
        await updateQuantity(productName, 1);
        return;
    }

    // Обновляем количество товара в корзине
    await updateQuantity(productName, newQuantity);
};

// Удалить товар из корзины
const removeFromBasket = async (productName: string) => {
    const userId = getOrCreateUserId();
    try {
        await axios.delete(`${apiBaseUrl}/api/baskets/remove`, { 
            data: { 
                userId, 
                'items-product-name': productName 
            } 
        });
        fetchBasket();
    } catch (error) {
        console.error('Ошибка при удалении товара из корзины:', error);
    }
};

// Функция для плавной прокрутки к секции
function scrollToSection(sectionId: string) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

// Подсчет итоговой суммы
const totalPrice = computed(() => {
    return basket.value.reduce((total, item) => {
        return total + item['items-price'] * item['items-quantity']; // Теперь price - число
    }, 0);
});

interface Category {
  _id: string;
  'categories-name': string;
}

const categories = ref<Category[]>([]);

const fetchCategories = async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/categories`);
    const data = await response.json();
    categories.value = data;
  } catch (error) {
    console.error('Ошибка при получении категорий:', error);
  }
};

// Загрузить категории при монтировании компонента
onMounted(() => {
  fetchCategories();
});

// Проверка перед созданием нового заказа
const checkActiveOrder = async () => {
  const userId = getOrCreateUserId();
  try {
    const response = await axios.get(`${apiBaseUrl}/api/orders?userId=${userId}`);
    const orders = Array.isArray(response.data) ? response.data : [response.data]; // Преобразуем в массив, если это объект
    const activeOrder = orders.find(order => order['order-status'] === 'Не готов');

    if (activeOrder) {
      // Добавляем номер активного заказа в сообщение об ошибке
      activeOrderError.value = `У вас уже есть активный заказ #${activeOrder.orderNumber}!`;
      return false;
    }
    activeOrderError.value = null; // Сбрасываем ошибку, если активного заказа нет
    return true;
  } catch (error) {
    console.error('Ошибка при проверке активного заказа:', error);
    activeOrderError.value = 'Ошибка при проверке активного заказа';
    return false;
  }
};

// Создание заказа
const createOrder = async () => {
  const hasActiveOrder = await checkActiveOrder();
  if (!hasActiveOrder) return;

  const name = (document.getElementById('NameTextBox') as HTMLInputElement).value;
  const email = (document.getElementById('EmailTextBox') as HTMLInputElement).value;
  const phone = (document.getElementById('NumberTextBox') as HTMLInputElement).value;

  if (!name || !email || !phone) {
    emptyFieldsError.value = 'Пожалуйста, заполните все поля';
    emailError.value = null;
    return;
  }
  // Проверка email
  if (!validateEmail(email)) {
    emailError.value = 'Не допустимый формат электронной почты.';
    return;
  }
    // Проверка номера телефона
    if (!validatePhoneNumber(phone)) {
    return;
  }
  const userId = getOrCreateUserId();

  try {
    // Создаем заказ
    const response = await axios.post(`${apiBaseUrl}/api/orders`, {
      userId,
      items: basket.value,
      'order-name': name,
      'order-gmail': email,
      'order-phone': phone,
    });
    orderNumber.value = response.data.orderNumber; // Предполагаем, что сервер возвращает orderNumber
    // Очищаем корзину на сервере
    await axios.delete(`${apiBaseUrl}/api/baskets/${userId}`);

    // Закрываем модальное окно
    isModalOpen.value = false;

    // Очищаем корзину на клиенте
    basket.value = [];

        // Открываем модальное окно с подтверждением заказа
        isOrderSuccessModalOpen.value = true;
  } catch (error) {
    console.error('Ошибка при создании заказа:', error);
    alert('Произошла ошибка при создании заказа');
  }
};

// Функция для проверки корректности email
const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Проверка на общий формат email
  const allowedDomains = ['gmail.com', 'mail.ru', 'yandex.ru', 'yahoo.com']; // Список разрешенных доменов
  if (!regex.test(email)) {
    isEmailValid.value = false; // Email не соответствует формату
    return false;
  }
  const domain = email.split('@')[1]; // Получаем домен
  if (!allowedDomains.includes(domain)) {
    isEmailValid.value = false; // Домен не в списке разрешенных
    return false;
  }
  isEmailValid.value = true; // Email валиден
  return true;
};

// Функция для сброса ошибки незаполненных полей
const clearEmptyFieldsError = () => {
  emptyFieldsError.value = null; // Сбрасываем ошибку
};

// Функция для сброса ошибки email
const clearEmailError = () => {
  emailError.value = null; // Сбрасываем ошибку
};

// Обработчик для изменения поля ввода email
const handleEmailInput = (event: Event) => {
  const email = (event.target as HTMLInputElement).value;
  validateEmail(email); // Проверяем email
  clearEmailError(); // Сбрасываем ошибку email
  clearEmptyFieldsError(); // Сбрасываем ошибку незаполненных полей
};

// Функция для фильтрации ввода в поле email
const filterEmailInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  // Регулярное выражение для разрешенных символов: английские буквы, цифры, @ и .
  const regex = /^[a-zA-Z0-9@.]*$/;

  // Если введенный символ не соответствует разрешенным, удаляем его
  if (!regex.test(value)) {
    input.value = value.replace(/[^a-zA-Z0-9@.]/g, ''); // Удаляем все недопустимые символы
  }

  // Вызываем handleEmailInput для проверки валидности email
  handleEmailInput(event);
};

// Функция для фильтрации ввода в поле имени
const filterNameInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  // Регулярное выражение для разрешенных символов: только буквы (английские и русские)
  const regex = /^[a-zA-Zа-яА-Я\s]*$/;

  // Если введенный символ не соответствует разрешенным, удаляем его
  if (!regex.test(value)) {
    input.value = value.replace(/[^a-zA-Zа-яА-Я\s]/g, ''); // Удаляем все недопустимые символы
  }
};

// Функция для форматирования номера телефона
const formatPhoneNumber = (phone: string): string => {
  // Удаляем все нецифровые символы
  const cleaned = ('' + phone).replace(/\D/g, '');

  // Проверяем, если номер начинается с +, оставляем его
  if (cleaned.startsWith('+')) {
    const match = cleaned.match(/^\+(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);

    if (match) {
      let formattedNumber = '+';
      if (match[1]) formattedNumber += ` (${match[1]}`;
      if (match[2]) formattedNumber += `) ${match[2]}`;
      if (match[3]) formattedNumber += `-${match[3]}`;
      if (match[4]) formattedNumber += `-${match[4]}`;

      return formattedNumber;
    }
  }

  // Если номер не начинается с +, форматируем как +7 (XXX) XXX-XX-XX
  const match = cleaned.match(/^(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);

  if (match) {
    let formattedNumber = '+';
    if (match[1]) formattedNumber += `${match[1]}`;
    if (match[2]) formattedNumber += ` (${match[2]}`;
    if (match[3]) formattedNumber += `) ${match[3]}`;
    if (match[4]) formattedNumber += `-${match[4]}`;
    if (match[5]) formattedNumber += `-${match[5]}`;

    return formattedNumber;
  }

  return '+';
};

// Обработчик ввода для поля телефона
const handlePhoneInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const formattedNumber = formatPhoneNumber(input.value);
  input.value = formattedNumber;
};

// Обработчик для фокуса на поле телефона
const handlePhoneFocus = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.value.startsWith('+')) {
    input.value = '+';
  }
};

// Обработчик для потери фокуса на поле телефона
const handlePhoneBlur = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.value === '+') {
    input.value = ''; // Удаляем +, если поле пустое
  }
};

// Функция для фильтрации ввода в поле телефона
const filterPhoneInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  // Регулярное выражение для разрешенных символов: только цифры
  const regex = /^[0-9]*$/;

  // Если введенный символ не соответствует разрешенным, удаляем его
  if (!regex.test(value)) {
    input.value = value.replace(/[^0-9]/g, '');
  }

  // Вызываем handlePhoneInput для форматирования номера
  handlePhoneInput(event);
};

</script>
<template>

	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Авто-химия</title>
	<link rel="icon" href="../image/IcoL.ico" type="image/x-icon"/>

	<nav clas=Navbar>
		<div class="Container">
			<a href="/" class="Navbar-Logo"><img src="../image/Logo.jpg" style="width:160px; height:100px"/></a>
			<ul class="Navbar-Menu">
				<li><a href="/">Главная</a></li>
				<li><a href="#section1" @click.prevent="scrollToSection('section1')">Магазин</a></li>
				<li><a href="#section2" @click.prevent="scrollToSection('section2')">О компании</a></li>
				<li><a class="LastA" href="#section3" @click.prevent="scrollToSection('section3')">Контакты</a></li>
			</ul>
		</div>
	</nav>
	<div class="DivImage">
		<img src="../image/MainPageImage.jpg" style="width:100%; height:100%; object-fit: cover;"/>
	<div class="PageInfoFooter">
		<img src="../image/scrol.png" style="width:50px ; height:45px" />
	</div>
	</div>
	<div class="MainPageInfoBody" >
			<div class="MainPageInfoScrol">
	<div class="MainPageInfo">
		<h1 class="NameStore">Авто-химия</h1>
		<div class="InfoStore">
			<h2 class="InfoStoreText">Автохимия и расходные материалы для ремонта (очистители, смазки, герметики, ахо, укрывочная продукция, метизы и прочее.) <p class="InfoStoreTextTwo">Выкупим неликвид с вашего склада на выгодных условиях</p></h2>
		</div>
		<div class="DivInfoButton">
			<button class="InfoButton" @click="scrollToSection('section1')">Каталог</button>
		</div>
	</div>
		</div>
</div>
<div class="CancerBody" v-if="basket.length > 0" style="transition: opacity 0.3s ease;">
	<div class="Cancer"><img id="CancerImage" alt="" src="../image/CancerImage.png" @click="isModalOpen = true" /></div>
</div>
<Teleport to="body">
    <!-- Модальное окно с подтверждением заказа -->
    <div v-if="isOrderSuccessModalOpen" id="orderSuccessModal" class="modal-success">
    <div class="modal-success-content">
      <div class="modal-success-ModalTitle">
        <h1 class="modal-success-modaltitle">Ваш заказ успешно создан!</h1>
      </div>
      <div class="modal-success-OrderNumber">
        <p>Номер вашего заказа: #{{ orderNumber }}</p>
      </div>
      <div class="modal-success-ButtonModal">
        <button id="modal-success-BtnModal" @click="isOrderSuccessModalOpen = false">Закрыть</button>
      </div>
    </div>
  </div>
<div v-if="isModalOpen" id="modal" class="modal" >
    <div class="modal-content" ref="modalContent">
        <span class="close" @click="isModalOpen = false">&times;</span>
        <div class="ModalTitle"><h1 class="modaltitle">Ваш заказ:</h1></div>
        <div class="SliderModal">
          <div class="SlidesModal">
            <div class="PageModal ActiveModal">
              <div class="ContainerModal">
                <div v-for="(item, index) in basket" :key="item._id" class="itemModal">
                  <div class="ProductImageModal">
                    <img :src="item['items-product-image']" style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>
                  <div class="InfoProductModal">
                    <h4 class="ProductNameModal">{{ item['items-product-name'] }}</h4>
                    <div class="ProductOneOrderModalBox">
                      <h5 class="hsixstyle">{{ formatPrice(item['items-price']) }}р/шт</h5>
                    </div>
                    <div class="QuantityProductModal">
                      <button @click="updateQuantity(item['items-product-name'], item['items-quantity'] - 1)" class="BtnsQuantity">-</button>
                      <input type="number" :id="`quantity${index}`" class="quantitystye" :value="item['items-quantity']" 
                      @input="handleQuantityChange(item['items-product-name'], $event)" min="1" />
                      <button @click="updateQuantity(item['items-product-name'], item['items-quantity'] + 1)" class="BtnsQuantity Plus">+</button>
                    </div>
                  </div>
                  <div class="ProductSumPrice">
                    <h4 id="hfivestyle">{{ formatPrice(item['items-price'] * item['items-quantity']) }}/Руб.</h4>
                  </div>
                  <div class="DeliteProductModal">
                    <button @click="removeFromBasket(item['items-product-name'])" class="BtnsDeliteProductModal">X</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="ContactsModal">
        	<div class="NameBox">
        		<h2 class="htwostyle">Ваше имя:</h2>
        		<input id="NameTextBox" type="text" placeholder="" @input="filterNameInput">
        	</div>
        	<div class="EmailBox">
        		<h2 class="htwostyle">Ваша почта:</h2>
        		<input id="EmailTextBox" type="text" placeholder="" @input="filterEmailInput"  :class="{ 'invalid-email': !isEmailValid }">
        	</div>
        	<div class="NumberBox">
        		<h2 class="htwostyle">Ваш телефон:</h2>
        		<input id="NumberTextBox"
                   type="text" 
                   placeholder="+7 (918) 000-00-00" 

                   @blur="handlePhoneBlur" 
                   @input="filterPhoneInput"
                   @focus="handlePhoneFocus"/>
        	</div>
        </div>
        <div class="TotalPrice">
        	<h3 class="SumModal">Сумма:</h3>
        	<h3>{{ formatPrice(totalPrice) }} р</h3>
        </div>
        <div class="ButtonModal">
        	<button id="BtnModal" @click="createOrder">Оформить заказ</button>
          <div v-if="emptyFieldsError" class="error-message">
            {{ emptyFieldsError }}
          </div>
          <div v-if="emailError" class="error-message-main">
            {{ emailError }}
          </div>
          <div v-if="phoneError" class="error-message-main">
            {{ phoneError }}
          </div>
          <div v-if="activeOrderError" class="error-message-main">
            {{ activeOrderError }}
          </div>
        </div>
    </div>
</div>
</teleport>
<div class="CategoriesBody">
  <div class="CategoriesCenter">
    <div class="Categories" id="section1">
      <!-- Отображаем каждую категорию из списка categories -->
      <div
        class="Сategory"
        v-for="(category, index) in categories"
        :key="index"
        @click="selectCategory(category._id, category['categories-name'])"
      >
        <a style="text-decoration: none; color: black;">{{ category['categories-name'] }}</a>
      </div>
    </div>
  </div>
</div>
	<div class="slider">
  <div class="slides">
    <!-- Динамически создаем слайды на основе количества страниц -->
    <div v-for="page in totalPages" :key="page" class="page" :class="{ active: currentPage === page - 1 }">
      <div class="container">
        <!-- Отображаем товары для текущей страницы -->
        <div class="item" v-for="(item, index) in getProductsForPage(page - 1)" :key="index">
          <div class="ProductPreview">
            <NuxtLink :to="`/product/${item._id}`">
              <img :src="item['product-image']" style="width:100%; height:100%;" />
            </NuxtLink>
          </div>
          <div class="ProductName">{{ item['product-name'] }}</div>
          <div class="Price">{{ formatPrice(item['product-price']) }}р<p class="quantity">/1шт</p></div>
          <div class="ProductButton"><button class="ProductBtn" @click="addToBasket(item)">Добавить в корзину</button></div>
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
<div class="AboutUsBody" id="section2">
<div class="AboutUsOllContent">
	<div class="AboutUsContent">
		<div class="AboutUsOllText">
			<div class="AboutUsTitle"><h1>О компании</h1></div>
			<div class="AboutUsText"><h2>Мы занимаемся поставками расходных материалов для ремонта в автосалоны, автосервисы, автотранспортные предприятия так, чтобы Вы о них не думали. С радостью возьмем на себя ненужную вам рутину по поиску и доставке материалов для ремонта по самым выгодным ценам. Для нас важно, чтобы с нами вы заработали больше!</h2></div>
		</div>
		<div class="AboutUsLogoContent">
		<div class="AboutUsLogo"><img class="AboutUsImage" src="../image/Logo.jpg"/></div>
		</div>
	</div>
</div>	
</div>
<div class="YandexMapBody" id="section3">
	<div class="YandexMapContent">
		<div style="position:relative;overflow:hidden;"><a href="https://yandex.ru/maps/35/krasnodar/?utm_medium=mapframe&utm_source=maps" style=" color:#eee;font-size:12px;position:absolute;top:0px;">Краснодар</a><a href="https://yandex.ru/maps/35/krasnodar/house/magistralnaya_ulitsa_11k3/Z0AYdgBgQEYOQFpvfXxyc3pqZw==/services/?ll=39.071508%2C45.032397&tab=services&utm_medium=mapframe&utm_source=maps&z=19.4" style="color:#eee;font-size:12px;position:absolute;top:14px;">Магистральная улица, 11к3 — Яндекс Карты</a><iframe class="YandexMap" src="https://yandex.ru/map-widget/v1/?ll=39.071508%2C45.032397&mode=whatshere&tab=services&whatshere%5Bpoint%5D=39.070931%2C45.032465&whatshere%5Bzoom%5D=17&z=19.4" width="800" height="450" frameborder="1" allowfullscreen="true" style="position:relative;"></iframe></div>
	</div>
</div>
<div class="FooterBody">
	<div class="FooterBodyContent">
		<div class="FooterContacts">
			<h2 class="FooterTitle">Краснодар:</h2>
			<div class="FooterTextContent"> 
			<p class="FooterText">+7(928)660-97-79</p>
			<p class="FooterText">+7(928)227-55-15</p>
			<p class="FooterText">+7(967)660-09-51</p>
			<p class="FooterText">+7(967)660-09-47</p>
			<p class="FooterText gmail">info@himautopro.ru</p>
			</div>
		</div>
		<div class="FooterSocial">
			<div class="FooterSocialContent">
			<div class="Social">
			 <img src="../image/VK.png"style="width: 45px;" />
			 <img src="../image/Telegram.png"style="width: 45px;" />
			</div>
			</div>
		</div>
	</div>
</div>

</template>