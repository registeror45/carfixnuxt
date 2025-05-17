<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import 'cleave.js/dist/addons/cleave-phone.ru'; // Для поддержки русского формата

const { public: { apiBaseUrl } } = useRuntimeConfig()
const notifications = ref<{ message: string; id: number }[]>([]);
const orders = ref<Order[]>([]);
const isModalOpen = ref(false);
const selectedOrder = ref<Order | null>(null);
const searchQuery = ref('');
const tempOrderStatus = ref(''); // Временная переменная для хранения статуса
const isDeleteModalOpen = ref(false);
const orderToDelete = ref<Order | null>(null);
const showNotification = ref(false);
const notificationMessage = ref('');

let notificationId = 0;

const addNotification = (message: string) => {
  const id = notificationId++;
  notifications.value.unshift({ message, id }); // Добавляем новое уведомление в начало массива

  // Удаляем уведомление через 5 секунд
  setTimeout(() => {
    notifications.value = notifications.value.filter((n) => n.id !== id);
  }, 3000);
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
// Проверка токена при загрузке страницы
onMounted(async () => {
  try {
    const response = await axios.get(`${apiBaseUrl}/api/admins/check-auth`, {
      withCredentials: true, // Убедитесь, что withCredentials: true
    });
    console.log('Ответ от сервера при проверке авторизации', response.data);
    if (!response.data.success || response.data.role !== 'yAdmin') {
      window.location.href = '/admin'; // Перенаправляем на страницу авторизации
    }
  } catch (error) {
    console.error('Ошибка при проверке авторизации', error);
    window.location.href = '/admin'; // Перенаправляем на страницу авторизации
  }
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

interface Order {
  _id: string;
  orderNumber: number;
  'order-name': string;
  'order-gmail': string;
  'order-phone': string;
  'order-status': string;
  items: {
    'items-product-name': string;
    'items-quantity': number;
    'items-price': number; // Теперь items-price имеет тип number
    'items-product-image': string;
  }[];
}

const confirmDeleteOrder = (order: Order) => {
  orderToDelete.value = order;
  isDeleteModalOpen.value = true;
};

// Загрузка заказов при монтировании компонента
onMounted(async () => {
  try {
    const response = await axios.get(`${apiBaseUrl}/api/orders`);
    orders.value = response.data;
  } catch (error) {
    console.error('Ошибка при загрузке заказов:', error);
  }
});

// Фильтрация заказов по номеру заказа, почте или телефону
const filteredOrders = computed(() => {
  let filtered = orders.value;

  // Фильтрация по поисковому запросу
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();

    // Проверяем, начинается ли запрос с #
    if (query.startsWith('#')) {
      // Ищем только по номеру заказа, убирая # из запроса
      const orderNumberQuery = query.slice(1); // Убираем первый символ #
      filtered = filtered.filter((order) =>
        order.orderNumber.toString().includes(orderNumberQuery)
      );
    } else {
      // Обычный поиск по номеру заказа, почте или телефону
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toString().includes(query) || // Поиск по номеру заказа
          order['order-gmail'].toLowerCase().includes(query) || // Поиск по почте
          order['order-phone'].toLowerCase().includes(query) // Поиск по телефону
      );
    }
  }

  // Сортировка заказов
  return filtered.sort((a, b) => {
    if (a['order-status'] === 'Не готов' && b['order-status'] !== 'Не готов') {
      return -1; // Заказы "Не готов" выше остальных
    } else if (a['order-status'] !== 'Не готов' && b['order-status'] === 'Не готов') {
      return 1; // Заказы "Не готов" выше остальных
    } else if (a['order-status'] === 'Готов' && b['order-status'] === 'Готов') {
      // Если оба заказа "Готов", можно отсортировать по времени изменения или другому критерию
      return b.orderNumber - a.orderNumber; // Пример: сортировка по номеру заказа
    } else {
      return 0; // Остальные случаи (например, оба заказа "Не готов")
    }
  });
});

// Открыть модальное окно
const openModal = (order: Order) => {
  selectedOrder.value = order;
  tempOrderStatus.value = order['order-status']; // Инициализируем временный статус
  isModalOpen.value = true;
};

// Закрыть модальное окно
const closeModal = () => {
  isModalOpen.value = false;
  selectedOrder.value = null;
  tempOrderStatus.value = ''; // Сбрасываем временный статус
};

// Удаление заказа
const deleteOrder = async () => {
  if (orderToDelete.value) {
    try {
      await axios.delete(`${apiBaseUrl}/api/orders/${orderToDelete.value._id}`);
      orders.value = orders.value.filter((order) => order._id !== orderToDelete.value?._id);
      
      // Показываем уведомление
      addNotification(`Был удален заказ #${orderToDelete.value.orderNumber}`);

      // Закрываем модальное окно подтверждения удаления
      isDeleteModalOpen.value = false;
      orderToDelete.value = null;
      closeModal();
    } catch (error) {
      console.error('Ошибка при удалении заказа:', error);
    }
  }
};

// Удаление товара из заказа
const removeItemFromOrder = async (index: number) => {
  if (selectedOrder.value) {
    selectedOrder.value.items.splice(index, 1);

    try {
      await axios.put(`${apiBaseUrl}/api/orders/${selectedOrder.value._id}`, {
        items: selectedOrder.value.items,
      });
    } catch (error) {
      console.error('Ошибка при удалении товара из заказа:', error);
    }
  }
};

// Сохранение изменений в заказе
const saveOrderChanges = async () => {
  if (selectedOrder.value) {
    try {
      // Применяем временный статус к заказу
      selectedOrder.value['order-status'] = tempOrderStatus.value;

      // Отправляем обновленные данные на сервер
      await axios.put(`${apiBaseUrl}/api/orders/${selectedOrder.value._id}`, {
        'order-status': selectedOrder.value['order-status'],
        items: selectedOrder.value.items,
      });

      // Обновляем локальное состояние заказов
      orders.value = orders.value.map((order) =>
        order._id === selectedOrder.value?._id ? { ...order, 'order-status': selectedOrder.value['order-status'] } : order
      );

      closeModal(); // Закрываем модальное окно после сохранения
    } catch (error) {
      console.error('Ошибка при сохранении изменений в заказе:', error);
    }
  }
};

// Обновление количества товара в заказе
const updateItemQuantity = async (index: number, quantity: number) => {
  if (selectedOrder.value) {
    if (quantity < 1) quantity = 1;
    selectedOrder.value.items[index]['items-quantity'] = quantity;

    try {
      await axios.put(`${apiBaseUrl}/api/orders/${selectedOrder.value._id}`, {
        items: selectedOrder.value.items,
      });
    } catch (error) {
      console.error('Ошибка при обновлении количества товара:', error);
    }
  }
};

// Вычисление общей суммы заказа
const totalOrderPrice = computed(() => {
  if (selectedOrder.value) {
    return selectedOrder.value.items.reduce((total, item) => {
      return total + item['items-price'] * item['items-quantity']; // Теперь items-price - число
    }, 0);
  }
  return 0; // Если заказ не выбран, возвращаем 0
});

const formatPhoneNumber = (input: string): string => {
  // Если ввод начинается с +, форматируем как номер телефона
  if (input.startsWith('+')) {
    // Удаляем все нецифровые символы, кроме +
    const cleaned = input.replace(/[^\d+]/g, '');

    // Форматируем номер телефона
    const match = cleaned.match(/^\+(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);

    if (match) {
      let formattedNumber = '+';
      if (match[1]) formattedNumber += `${match[1]}`; // Первая цифра после +
      if (match[2]) formattedNumber += ` (${match[2]}`; // Следующие 3 цифры
      if (match[3]) formattedNumber += `) ${match[3]}`; // Следующие 3 цифры
      if (match[4]) formattedNumber += `-${match[4]}`; // Следующие 2 цифры
      if (match[5]) formattedNumber += `-${match[5]}`; // Последние 2 цифры

      return formattedNumber;
    }
  }

  // Если ввод не начинается с +, возвращаем исходное значение
  return input;
};

const handleInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  // Если ввод начинается с +, форматируем как номер телефона
  if (value.startsWith('+')) {
    const formattedPhone = formatPhoneNumber(value);
    input.value = formattedPhone; // Устанавливаем отформатированное значение
    searchQuery.value = formattedPhone; // Обновляем значение searchQuery
  } else {
    // Иначе оставляем как есть
    searchQuery.value = value;
  }
};

</script>
<template>
  <button @click="handleLogout" class="logout-class">Выйти</button>
  <div class="div-body-yAdmin">
    <div class="container-order">
      <!-- Поле поиска -->
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по номеру заказа, почте или телефону"
          class="search-input"
          @input="handleInput"
        />
      </div>

      <!-- Список заказов -->
      <div class="order-list">
        <div
          v-for="(order, index) in filteredOrders"
          :key="index"
          class="order-item"
          @click="openModal(order)"
        >
          <div class="order-info">
            <span class="field-value order-number">#{{ order.orderNumber }}</span>
            <span class="field-value order-gmail">{{ order['order-gmail'] }}</span>
            <span class="field-value phone">{{ order['order-phone'] }}</span>
            <span :class="['status', { 'ready': order['order-status'] === 'Готов', 'not-ready': order['order-status'] === 'Не готов' }]">
              {{ order['order-status'] }}
            </span>
          </div>
        </div>
      </div>
        <!-- Модальное окно подтверждения удаления -->
        <div v-if="isDeleteModalOpen" class="modal-overlay-delete" @click="isDeleteModalOpen = false">
          <div class="modal-content-delete" @click.stop>
            <span class="close-yAdmin" @click="isDeleteModalOpen = false">&times;</span>
            <h2>Вы действительно хотите удалить заказ #{{ orderToDelete?.orderNumber }}?</h2>
            <div class="modal-actions">
              <button @click="deleteOrder" class="btn-delete">Удалить</button>
              <button @click="isDeleteModalOpen = false" class="btn-cancel">Отмена</button>
            </div>
          </div>
        </div>
        <!-- Уведомление об удалении заказа -->
         <div class="notification-container">
        <div v-for="notification in notifications" :key="notification.id" class="notification">
          {{ notification.message }}
        </div>
      </div>
      <!-- Модальное окно с деталями заказа -->
      <div v-if="isModalOpen" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <span class="close-yAdmin" @click="closeModal">&times;</span>
          <h2 style="text-align: left;">Информация о заказе:</h2>
          <!-- Слайдер для товаров в заказе -->
          <div class="SliderModal">
            <div class="SlidesModal">
              <div class="PageModal ActiveModal">
                <div class="ContainerModal">
                  <div
                    v-for="(item, index) in selectedOrder?.items"
                    :key="index"
                    class="itemModal"
                  >
                    <div class="ProductImageModal">
                      <img :src="item['items-product-image']" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                    <div class="InfoProductModal">
                      <h4 class="ProductNameModal">{{ item['items-product-name'] }}</h4>
                      <div class="ProductOneOrderModalBox">
                        <h5 class="hsixstyle">{{ formatPrice(item['items-price']) }} р./шт</h5>
                      </div>
                      <div class="QuantityProductModal">
                        <button @click="updateItemQuantity(index, item['items-quantity'] - 1)" class="BtnsQuantity">-</button>
                        <input
                          type="number"
                          :id="`quantity${index}`"
                          class="quantitystye"
                          :value="item['items-quantity']"
                          @input="(event) => updateItemQuantity(index, parseInt((event.target as HTMLInputElement).value))"
                          min="1"
                        />
                        <button @click="updateItemQuantity(index, item['items-quantity'] + 1)" class="BtnsQuantity Plus">+</button>
                      </div>
                    </div>
                    <div class="ProductSumPrice">
                      <h4 id="hfivestyle">{{formatPrice(item['items-price'] * item['items-quantity']) }} /Руб.</h4>
                    </div>
                    <div class="DeliteProductModal">
                      <button @click="removeItemFromOrder(index)" class="BtnsDeliteProductModal">X</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-info" v-if="selectedOrder">
            <p><strong>Имя:</strong> {{ selectedOrder['order-name'] }}</p>
            <p><strong>Почта:</strong> {{ selectedOrder['order-gmail'] }}</p>
            <p><strong>Телефон:</strong> {{ selectedOrder['order-phone'] }}</p>
            <p><strong>Статус:</strong>
              <select
                v-model="tempOrderStatus"
              >
                <option value="Не готов">Не готов</option>
                <option value="Готов">Готов</option>
              </select>
            </p>
            <p><strong>Сумма:</strong> {{ formatPrice(totalOrderPrice) }} р.</p>
          </div>

          <!-- Кнопки управления заказом -->
          <div class="modal-actions">
            <button @click="saveOrderChanges" class="btn-save">Сохранить изменения</button>
            <button @click="confirmDeleteOrder(selectedOrder!)" class="btn-delete">Удалить заказ</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>