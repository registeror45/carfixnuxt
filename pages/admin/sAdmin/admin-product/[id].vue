<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Cleave from 'cleave.js'; // Импортируем Cleave
import 'cleave.js/dist/addons/cleave-phone.ru'; // Для поддержки русского формата
const { public: { apiBaseUrl } } = useRuntimeConfig()
const route = useRoute();
const router = useRouter();
const productId = route.params.id;
const productImage = ref<string | null>(null);
const productName = ref('');
const productPrice = ref<number | null>(null); // Храним цену как число
const productDescription = ref('');
const categories = ref<{ _id: string; 'categories-name': string }[]>([]);
const selectedCategory = ref('');
const priceInputRef = ref<HTMLInputElement | null>(null); // Ref для управления input
// Состояние для управления видимостью модального окна
const showDeleteModal = ref(false);

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

// Функция для загрузки данных товара
const fetchProduct = async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/products/${productId}`);
    if (!response.ok) {
      throw new Error('Ошибка при получении товара');
    }
    const data = await response.json();
    productName.value = data['product-name'];
    productPrice.value = data['product-price']; // Теперь price - число
    productDescription.value = data['product-description'];
    selectedCategory.value = data['product-category'];
    productImage.value = data['product-image'];

    // Устанавливаем форматированное значение цены
    if (priceInputRef.value) {
      const cleave = new Cleave(priceInputRef.value, {
        numeral: true,
        numeralThousandsGroupStyle: 'thousand',
        numeralDecimalMark: ',',
        delimiter: '.',
        numeralDecimalScale: 2,
      });
      cleave.setRawValue(data['product-price'].toString().replace('.', ','));
    }
  } catch (error) {
    console.error('Ошибка:', error);
    await router.push('/admin/sAdmin/');
  }
};

// Функция для обновления товара
const updateProduct = async () => {
  if (!productName.value || productPrice.value === null || !productDescription.value || !selectedCategory.value || !productImage.value) {
    alert('Все поля обязательны для заполнения');
    return;
  }

  const productData = {
    'product-name': productName.value,
    'product-description': productDescription.value,
    'product-price': productPrice.value, // Теперь price передается как число
    'product-image': productImage.value,
    'product-category': selectedCategory.value,
  };

  try {
    const response = await fetch(`${apiBaseUrl}/api/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Ошибка сервера:', errorData);
      throw new Error('Ошибка при обновлении товара');
    }

    const data = await response.json();
    await router.push('/admin/sAdmin/');
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка при обновлении товара');
  }
};

// Функция для удаления товара
const deleteProduct = async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/products/${productId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Ошибка при удалении товара');
    }

    await router.push('/admin/sAdmin/');
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка при удалении товара');
  }
};

// Функция для открытия модального окна
const openDeleteModal = () => {
  showDeleteModal.value = true;
};

// Функция для закрытия модального окна
const closeDeleteModal = () => {
  showDeleteModal.value = false;
};

// Загружаем категории и данные товара при монтировании компонента
onMounted(() => {
  fetchCategories();
  fetchProduct();
});
</script>

<template>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Редактирование товара</title>
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
              placeholder="Введите стоимость товара" 
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
              <button class="PageAdminBtnProductAdd" @click="updateProduct">Обновить</button>
              <button class="PageAdminBtnProductDelete" @click="openDeleteModal">Удалить</button>
            </div>
          </div>
          <!-- Блок с описанием -->
          <div class="PageProductDescriptionBlock">
            <textarea v-model="productDescription" placeholder="Введите описание товара" class="custom-textarea"></textarea>
          </div>
        </div>
      </div>
    </div>
    <!-- Модальное окно для подтверждения удаления -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal-content">
        <p>Вы действительно хотите удалить этот продукт?</p>
        <div class="modal-buttons">
          <button class="modal-button-delete-admin-product" @click="deleteProduct">Удалить</button>
          <button class="modal-button-cancel-admin-product" @click="closeDeleteModal">Отменить</button>
        </div>
      </div>
    </div>
  </template>