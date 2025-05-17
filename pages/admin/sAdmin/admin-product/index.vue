<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import 'cleave.js/dist/addons/cleave-phone.ru'; // Для поддержки русского формата
const { public: { apiBaseUrl } } = useRuntimeConfig()
const productImage = ref<string | null>(null);
const productName = ref('');
const productPrice = ref<number | null>(null); // Храним цену как число
const productDescription = ref('');
const categories = ref<{ _id: string; 'categories-name': string }[]>([]);
const selectedCategory = ref('');
const priceInputRef = ref<HTMLInputElement | null>(null); // Ref для управления input

// Инициализация Cleave.js для форматирования цены
onMounted(() => {
  if (priceInputRef.value) {
    // Функция для форматирования числа
    const formatNumber = (value: string) => {
      // Удаляем все символы, кроме цифр и запятой
      value = value.replace(/[^\d,]/g, '');

      // Разделяем целую и дробную части
      const [integerPart, decimalPart = ''] = value.split(',');

      // Форматируем целую часть с разделителями тысяч
      const formattedInteger = integerPart
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

      // Ограничиваем дробную часть двумя символами
      const truncatedDecimal = decimalPart.slice(0, 2).padEnd(2, '0');

      // Собираем значение обратно
      return formattedInteger + ',' + truncatedDecimal;
    };

    // Обработчик для форматирования ввода
    priceInputRef.value.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  const cursorPosition = input.selectionStart; // Сохраняем позицию курсора до изменения
  let value = input.value;

  // Проверяем, была ли удалена запятая
  const wasCommaRemoved = value.indexOf(',') === -1 && input.value.indexOf(',') !== -1;

  // Если запятая была удалена, восстанавливаем её и перемещаем курсор
  if (wasCommaRemoved && cursorPosition !== null) {
    // Восстанавливаем запятую
    value = value.slice(0, cursorPosition) + ',' + value.slice(cursorPosition);

    // Устанавливаем новое значение
    input.value = value;

    // Перемещаем курсор влево, перескакивая через запятую
    const newCursorPosition = Math.max(cursorPosition - 1, 0);
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    return; // Прерываем выполнение, чтобы избежать лишнего форматирования
  }

  // Форматируем значение
  const formattedValue = formatNumber(value);

  // Устанавливаем отформатированное значение
  input.value = formattedValue;

  // Преобразуем значение в число для хранения в productPrice
  const rawValue = formattedValue.replace(/\./g, '').replace(',', '.');
  productPrice.value = parseFloat(rawValue) || null;

  // Восстанавливаем позицию курсора
  if (cursorPosition !== null) {
    // Считаем количество добавленных разделителей тысяч (точек) до позиции курсора
    const addedSeparators = formattedValue
      .slice(0, cursorPosition)
      .split('')
      .filter((char) => char === '.').length;

    // Считаем количество удалённых разделителей тысяч (точек) до позиции курсора
    const removedSeparators = value
      .slice(0, cursorPosition)
      .split('')
      .filter((char) => char === '.').length;

    // Новая позиция курсора с учетом добавленных и удалённых разделителей
    let newCursorPosition = cursorPosition + (addedSeparators - removedSeparators);

    // Если курсор находится за запятой, корректируем его позицию
    const commaIndex = formattedValue.indexOf(',');
    if (commaIndex !== -1 && newCursorPosition > commaIndex) {
      // Если курсор за запятой, оставляем его там, если пользователь вводит копейки
      newCursorPosition = Math.min(newCursorPosition, formattedValue.length);
    }

    // Устанавливаем курсор на новую позицию
    input.setSelectionRange(newCursorPosition, newCursorPosition);
  }

  // Если значение пустое, устанавливаем курсор перед запятой
  if (formattedValue === ',00') {
    input.setSelectionRange(0, 0);
  }
});

// Обработчик для установки курсора перед ",00" при фокусе
priceInputRef.value.addEventListener('focus', () => {
  setTimeout(() => {
    const value = priceInputRef.value?.value || '';
    if (value === ',00') {
      priceInputRef.value?.setSelectionRange(0, 0);
    }
  }, 10); // Задержка 10 мс
});
    // Устанавливаем начальное значение ",00"
    priceInputRef.value.value = ',00';
  }
});

// Проверка токена при загрузке страницы
onMounted(async () => {
  try {
    const response = await axios.get(`${apiBaseUrl}/api/admins/check-auth`, {
      withCredentials: true,
    });
    console.log('Ответ от сервера при проверке авторизации', response.data);
    if (!response.data.success || response.data.role !== 'sAdmin') {
      window.location.href = '/admin';
    }
  } catch (error) {
    console.error('Ошибка при проверке авторизации', error);
    window.location.href = '/admin';
  }
});

// Функция для загрузки изображения
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && e.target.result) {
        productImage.value = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  }
};

// Функция для получения категорий из MongoDB
const fetchCategories = async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/categories`);
    if (!response.ok) {
      throw new Error('Ошибка при получении категорий');
    }
    const data = await response.json();
    categories.value = data.filter((category: { 'categories-name': string }) => category['categories-name'] !== 'Все');
  } catch (error) {
    console.error('Ошибка:', error);
  }
};

// Функция для сохранения товара
const saveProduct = async () => {
  if (!productName.value || productPrice.value === null || !productDescription.value || !selectedCategory.value || !productImage.value) {
    alert('Все поля обязательны для заполнения');
    return;
  }

  // Преобразуем цену в число перед отправкой
  const priceAsNumber = productPrice.value;

  const productData = {
    'product-name': productName.value,
    'product-description': productDescription.value,
    'product-price': priceAsNumber, // Отправляем как число
    'product-image': productImage.value,
    'product-category': selectedCategory.value,
  };

  console.log('Отправляемые данные:', productData);

  try {
    const response = await fetch(`${apiBaseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Ошибка сервера:', errorData);
      throw new Error('Ошибка при сохранении товара');
    }

    const data = await response.json();
    // Уведомление об успешном добавлении товара
    productName.value = '';
    productPrice.value = null; // Сбрасываем цену
    productDescription.value = '';
    selectedCategory.value = '';
    productImage.value = null;
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка при сохранении товара');
  }
  navigateTo("/admin/sAdmin");
};

// Загружаем категории при монтировании компонента
onMounted(() => {
  fetchCategories();
});
</script>

<template>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Создание товара</title>
  <link rel="icon" href="@/image/IcoL.ico" type="image/x-icon"/>
  <div class="GoBackBody">
    <NuxtLink to="/admin/sAdmin">
      <a class="BtnGoBack"><- назад</a>
    </NuxtLink>
  </div>
  <div class="PageProductBody">
    <div class="PageProductContent">
      <!-- Кнопка для загрузки картинки -->
      <div class="PageImageProduct">
        <input type="file" accept="image/*" @change="handleImageUpload" style="display: none;" id="imageUpload">
        <label for="imageUpload" class="PageBtnProductAdd" style="cursor: pointer;">
          {{ productImage ? 'Изменить изображение' : 'Загрузить изображение' }}
        </label>
        <img v-if="productImage" :src="productImage" style="width: 100%; height:100%; object-fit: cover;" />
      </div>
      <!-- Блок с полями ввода -->
      <div class="PageProductRightBlock">
        <div class="PageProductText">
          <input v-model="productName" placeholder="Введите название товара" class="custom-input" />
          <input 
            ref="priceInputRef"
            placeholder="Введите цену товара" 
            class="custom-input" 
          />
          <div class="PageVolumeSelection">
            <select v-model="selectedCategory" class="custom-select">
              <option value="" disabled selected>Выберите категорию товара</option>
              <option v-for="category in categories" :key="category._id" :value="category._id">
                {{ category['categories-name'] }}
              </option>
            </select>
          </div>
          <div class="PageButtonProductAdd">
            <button class="PageAdminBtnProductAdd" @click="saveProduct">Сохранить</button>
          </div>
        </div>
        <!-- Блок с описанием -->
        <div class="PageProductDescriptionBlock">
          <textarea v-model="productDescription" placeholder="Введите описание товара" class="custom-textarea"></textarea>
        </div>
      </div>
    </div>
  </div>
</template>