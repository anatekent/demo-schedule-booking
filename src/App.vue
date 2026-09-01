<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ArrowDown, ArrowUp, CalendarDays, ChevronLeft, ChevronRight, CircleCheck, Cloud, Filter, GripVertical, Pencil, Plus, Search, Trash2, X } from "@lucide/vue";
import { createScheduleRepository } from "./services/scheduleRepository";
import { atUtc, diffDays, isWeekend, plusDays, shortDate, toIso, weekday } from "./utils/date";

const DAY_WIDTH = 82;
const DEFAULT_DAYS_SHOWN = 14;
const MAX_RANGE_DAYS = 90;
const repository = createScheduleRepository();

const statusMeta = {
  preparing: { label: "準備中", className: "status-preparing" },
  active: { label: "進行中", className: "status-active" },
  reserved: { label: "預約", className: "status-reserved" },
  completed: { label: "已結束／成功", className: "status-completed" },
};

const blankBooking = () => ({
  equipmentId: "nitrogen", title: "", customer: "", contact: "", applicant: "", demoOwner: "",
  start: "2026-09-01", end: "2026-09-03", status: "reserved",
});

const blankEquipment = () => ({
  id: "", name: "", nameZh: "", maker: "", model: "", partNo: "", serialNo: "", accessories: "", sortOrder: null,
});

const equipment = ref([]);
const bookings = ref([]);
const loading = ref(true);
const rangeStart = ref(atUtc("2026-08-31"));
const rangeEnd = ref(plusDays(rangeStart.value, DEFAULT_DAYS_SHOWN - 1));
const rangeDraftStart = ref(toIso(rangeStart.value));
const rangeDraftEnd = ref(toIso(rangeEnd.value));
const rangeError = ref("");
const query = ref("");
const statusFilter = ref("all");
const dialogOpen = ref(false);
const equipmentDialogOpen = ref(false);
const editingId = ref(null);
const draggedEquipmentId = ref(null);
const dragOverEquipmentId = ref(null);
const form = reactive(blankBooking());
const equipmentForm = reactive(blankEquipment());
const error = ref("");
const equipmentError = ref("");
const savedMessage = ref("");
const loadError = ref("");
const dataMode = repository.mode;

onMounted(async () => {
  try {
    [equipment.value, bookings.value] = await Promise.all([repository.getEquipment(), repository.getBookings()]);
  } catch (caught) {
    loadError.value = caught instanceof Error ? caught.message : "無法讀取排程資料。";
  } finally {
    loading.value = false;
  }
});

const daysShown = computed(() => diffDays(rangeEnd.value, rangeStart.value) + 1);
const dates = computed(() => Array.from({ length: daysShown.value }, (_, index) => plusDays(rangeStart.value, index)));
const visibleEquipment = computed(() => {
  const value = query.value.trim().toLowerCase();
  if (!value) return equipment.value;
  return equipment.value.filter((item) => [item.name, item.nameZh, item.maker, item.model, item.partNo, item.serialNo, item.accessories].join(" ").toLowerCase().includes(value));
});
const filteredBookings = computed(() => bookings.value.filter((booking) => statusFilter.value === "all" || booking.status === statusFilter.value));

function bookingsFor(equipmentId) {
  return filteredBookings.value.filter((booking) => booking.equipmentId === equipmentId);
}

function syncRangeDrafts() {
  rangeDraftStart.value = toIso(rangeStart.value);
  rangeDraftEnd.value = toIso(rangeEnd.value);
}

function shiftRange(days) {
  rangeStart.value = plusDays(rangeStart.value, days);
  rangeEnd.value = plusDays(rangeEnd.value, days);
  rangeError.value = "";
  syncRangeDrafts();
}

function resetTodayRange() {
  rangeStart.value = atUtc(new Date().toISOString().slice(0, 10));
  rangeEnd.value = plusDays(rangeStart.value, DEFAULT_DAYS_SHOWN - 1);
  rangeError.value = "";
  syncRangeDrafts();
}

function applyCustomRange() {
  rangeError.value = "";
  if (!rangeDraftStart.value || !rangeDraftEnd.value) {
    rangeError.value = "請選擇開始與結束日期。";
    return;
  }
  const nextStart = atUtc(rangeDraftStart.value);
  const nextEnd = atUtc(rangeDraftEnd.value);
  const selectedDays = diffDays(nextEnd, nextStart) + 1;
  if (selectedDays < 1) {
    rangeError.value = "結束日期不可早於開始日期。";
    return;
  }
  if (selectedDays > MAX_RANGE_DAYS) {
    rangeError.value = `日期區間最多 ${MAX_RANGE_DAYS} 天。`;
    return;
  }
  rangeStart.value = nextStart;
  rangeEnd.value = nextEnd;
}

function openNew() {
  editingId.value = null;
  Object.assign(form, blankBooking(), { start: toIso(rangeStart.value), end: toIso(plusDays(rangeStart.value, 2)) });
  error.value = "";
  dialogOpen.value = true;
}

function openBooking(booking) {
  editingId.value = booking.id;
  const { id: _id, ...fields } = booking;
  Object.assign(form, fields);
  error.value = "";
  dialogOpen.value = true;
}

function closeDialog() {
  dialogOpen.value = false;
  error.value = "";
}

function openEquipment(item) {
  Object.assign(equipmentForm, blankEquipment(), item);
  equipmentError.value = "";
  equipmentDialogOpen.value = true;
}

function openNewEquipment() {
  Object.assign(equipmentForm, blankEquipment());
  equipmentError.value = "";
  equipmentDialogOpen.value = true;
}

function closeEquipmentDialog() {
  equipmentDialogOpen.value = false;
  equipmentError.value = "";
}

async function submitEquipment() {
  equipmentError.value = "";
  if (!equipmentForm.name.trim() || !equipmentForm.nameZh.trim()) {
    equipmentError.value = "請填寫設備英文名稱與中文分析項目。";
    return;
  }
  let saved;
  try {
    saved = await repository.saveEquipment({
      ...equipmentForm,
      sortOrder: equipmentForm.id ? equipmentForm.sortOrder : equipment.value.length + 1,
    });
  } catch (caught) {
    equipmentError.value = caught instanceof Error ? caught.message : "無法儲存設備明細。";
    return;
  }
  const existingIndex = equipment.value.findIndex((item) => item.id === saved.id);
  if (existingIndex >= 0) {
    equipment.value = equipment.value.map((item) => item.id === saved.id ? saved : item);
  } else {
    equipment.value.push(saved);
  }
  closeEquipmentDialog();
  savedMessage.value = existingIndex >= 0 ? "設備明細已更新" : "設備已新增";
  window.setTimeout(() => { savedMessage.value = ""; }, 2400);
}

async function reorderEquipment(sourceId, targetId) {
  if (query.value.trim()) {
    window.alert("請先清除搜尋條件，再調整設備順序。");
    return;
  }
  const sourceIndex = equipment.value.findIndex((item) => item.id === sourceId);
  const targetIndex = equipment.value.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
  const previous = equipment.value.map((item) => ({ ...item }));
  const reordered = equipment.value.map((item) => ({ ...item }));
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  equipment.value = reordered.map((item, index) => ({ ...item, sortOrder: index + 1 }));
  try {
    await repository.saveEquipmentOrder(equipment.value);
    savedMessage.value = "設備順序已更新";
    window.setTimeout(() => { savedMessage.value = ""; }, 1800);
  } catch (caught) {
    equipment.value = previous;
    window.alert(caught instanceof Error ? caught.message : "無法儲存設備順序，已還原原本順序。");
  }
}

function startEquipmentDrag(item, event) {
  if (query.value.trim()) {
    event.preventDefault();
    window.alert("請先清除搜尋條件，再調整設備順序。");
    return;
  }
  draggedEquipmentId.value = item.id;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", item.id);
}

async function dropEquipment(targetId) {
  const sourceId = draggedEquipmentId.value;
  draggedEquipmentId.value = null;
  dragOverEquipmentId.value = null;
  if (sourceId) await reorderEquipment(sourceId, targetId);
}

function endEquipmentDrag() {
  draggedEquipmentId.value = null;
  dragOverEquipmentId.value = null;
}

async function moveEquipment(itemId, direction) {
  if (query.value.trim()) {
    window.alert("請先清除搜尋條件，再調整設備順序。");
    return;
  }
  const index = equipment.value.findIndex((item) => item.id === itemId);
  const target = equipment.value[index + direction];
  if (target) await reorderEquipment(itemId, target.id);
}

async function deleteEquipment() {
  equipmentError.value = "";
  if (!equipmentForm.id) return;
  const relatedBookings = bookings.value.filter((booking) => booking.equipmentId === equipmentForm.id);
  if (relatedBookings.length > 0) {
    equipmentError.value = `此設備仍有 ${relatedBookings.length} 筆預約，請先刪除這些預約後再刪除設備。`;
    return;
  }
  if (!window.confirm(`確定要刪除「${equipmentForm.nameZh}」嗎？刪除後無法復原。`)) return;
  try {
    await repository.deleteEquipment(equipmentForm.id);
  } catch (caught) {
    equipmentError.value = caught instanceof Error ? caught.message : "無法刪除設備。";
    return;
  }
  equipment.value = equipment.value.filter((item) => item.id !== equipmentForm.id);
  closeEquipmentDialog();
  savedMessage.value = "設備已刪除";
  window.setTimeout(() => { savedMessage.value = ""; }, 2400);
}

async function submitBooking() {
  error.value = "";
  if (!form.title.trim() || !form.customer.trim()) {
    error.value = "請填寫 Demo 主題與客戶名稱。";
    return;
  }
  if (form.end < form.start) {
    error.value = "結束日期不可早於開始日期。";
    return;
  }
  const conflict = bookings.value.some((booking) =>
    booking.id !== editingId.value && booking.equipmentId === form.equipmentId && booking.start <= form.end && booking.end >= form.start,
  );
  if (conflict) {
    error.value = "此設備在選擇的期間已有預約，請調整日期。";
    return;
  }
  let saved;
  try {
    saved = await repository.saveBooking({ ...form, id: editingId.value ?? (dataMode === "demo" ? Date.now() : null) });
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "無法儲存預約。";
    return;
  }
  if (editingId.value) {
    bookings.value = bookings.value.map((item) => item.id === editingId.value ? saved : item);
  } else {
    bookings.value.push(saved);
  }
  closeDialog();
  savedMessage.value = editingId.value ? "預約已更新" : "預約已建立";
  window.setTimeout(() => { savedMessage.value = ""; }, 2400);
}

async function deleteBooking() {
  error.value = "";
  if (!editingId.value) return;
  if (!window.confirm(`確定要刪除「${form.title}」嗎？刪除後無法復原。`)) return;
  try {
    await repository.deleteBooking(editingId.value);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "無法刪除預約。";
    return;
  }
  bookings.value = bookings.value.filter((item) => item.id !== editingId.value);
  closeDialog();
  savedMessage.value = "預約已刪除";
  window.setTimeout(() => { savedMessage.value = ""; }, 2400);
}

function bookingVisible(booking) {
  const start = diffDays(atUtc(booking.start), rangeStart.value);
  const end = diffDays(atUtc(booking.end), rangeStart.value);
  return end >= 0 && start < daysShown.value;
}

function barStyle(booking, lane) {
  const start = Math.max(0, diffDays(atUtc(booking.start), rangeStart.value));
  const end = Math.min(daysShown.value - 1, diffDays(atUtc(booking.end), rangeStart.value));
  return {
    left: `${start * DAY_WIDTH + 4}px`,
    width: `${(end - start + 1) * DAY_WIDTH - 8}px`,
    top: `${12 + (lane % 2) * 48}px`,
  };
}
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="brand-block">
        <div class="brand-mark"><CalendarDays aria-hidden="true" /></div>
        <div><h1>Demo Schedule 預約排程</h1></div>
      </div>
      <div class="header-actions">
        
        <button class="button button-primary new-booking" type="button" @click="openNew"><Plus aria-hidden="true" />新增預約</button>
      </div>
    </header>

    <section class="workspace" aria-label="Demo 預約排程">
      <div class="toolbar">
        <div class="date-controls">
          <button class="button button-outline button-icon" type="button" aria-label="前一週" @click="shiftRange(-7)"><ChevronLeft /></button>
          <button class="button button-outline" type="button" @click="resetTodayRange">今天</button>
          <button class="button button-outline button-icon" type="button" aria-label="下一週" @click="shiftRange(7)"><ChevronRight /></button>
          <span class="range-label">{{ rangeStart.getUTCFullYear() }} 年 {{ shortDate(rangeStart) }} — {{ shortDate(rangeEnd) }}（{{ daysShown }} 天）</span>
          <div class="custom-range">
            <label><span>開始</span><input v-model="rangeDraftStart" class="control date-input" type="date" /></label>
            <span aria-hidden="true">—</span>
            <label><span>結束</span><input v-model="rangeDraftEnd" class="control date-input" type="date" /></label>
            <button class="button button-outline apply-range" type="button" @click="applyCustomRange">套用</button>
            <small v-if="rangeError" class="date-range-error">{{ rangeError }}</small>
          </div>
        </div>
        <div class="toolbar-right">
          <label class="search-box"><Search aria-hidden="true" /><input v-model="query" class="control" placeholder="搜尋設備、型號或料號" /></label>
          <div class="filter-box"><Filter aria-hidden="true" /><select v-model="statusFilter" class="control select-control" aria-label="狀態篩選"><option value="all">全部狀態</option><option v-for="(meta, key) in statusMeta" :key="key" :value="key">{{ meta.label }}</option></select></div>
        </div>
      </div>

      <div class="legend-row">
        <span>狀態</span>
        <span v-for="(meta, key) in statusMeta" :key="key" class="legend-item"><i :class="meta.className" />{{ meta.label }}</span>
        <span class="summary">共 {{ filteredBookings.length }} 筆預約 · {{ visibleEquipment.length }} 台設備</span>
      </div>

      <div v-if="loading" class="loading-state">載入排程資料中…</div>
      <div v-else-if="loadError" class="error-state"><strong>無法連線 SharePoint Lists</strong><span>{{ loadError }}</span><small>請檢查 `.env.local` 的 Site URL、清單名稱與登入權限。</small></div>
      <div v-else class="schedule-scroll">
        <div class="schedule-table" :style="{ width: `${500 + DAY_WIDTH * daysShown}px` }">
          <div class="schedule-header">
            <div class="equipment-header">
              <span class="equipment-header-title">設備／分析項目<button class="add-equipment" type="button" title="新增設備／分析項目" @click="openNewEquipment"><Plus />新增</button></span>
              <span>設備明細</span>
            </div>
            <div class="date-header" :style="{ gridTemplateColumns: `repeat(${daysShown}, ${DAY_WIDTH}px)` }">
              <div v-for="date in dates" :key="toIso(date)" :class="{ weekend: isWeekend(date) }"><strong>{{ shortDate(date) }}</strong><small>{{ weekday(date) }}</small></div>
            </div>
          </div>

          <div v-for="(item, itemIndex) in visibleEquipment" :key="item.id" class="schedule-row" :class="{ 'drag-over': dragOverEquipmentId === item.id, dragging: draggedEquipmentId === item.id }" @dragover.prevent="dragOverEquipmentId = item.id" @drop.prevent="dropEquipment(item.id)">
            <div class="equipment-cell">
              <div class="equipment-name">
                <div class="equipment-sort-controls">
                  <button class="sort-button drag-handle" type="button" :draggable="!query.trim()" :disabled="Boolean(query.trim())" title="拖曳調整順序" :aria-label="`拖曳 ${item.nameZh} 調整順序`" @dragstart="startEquipmentDrag(item, $event)" @dragend="endEquipmentDrag"><GripVertical /></button>
                  <button class="sort-button" type="button" :disabled="Boolean(query.trim()) || itemIndex === 0" :aria-label="`將 ${item.nameZh} 向上移`" title="向上移" @click="moveEquipment(item.id, -1)"><ArrowUp /></button>
                  <button class="sort-button" type="button" :disabled="Boolean(query.trim()) || itemIndex === visibleEquipment.length - 1" :aria-label="`將 ${item.nameZh} 向下移`" title="向下移" @click="moveEquipment(item.id, 1)"><ArrowDown /></button>
                </div>
                <button class="equipment-edit" type="button" :aria-label="`編輯 ${item.nameZh}`" title="編輯設備與明細" @click.stop="openEquipment(item)"><Pencil /></button>
                <strong>{{ item.name }}</strong><span>{{ item.nameZh }}</span>
              </div>
              <dl><div><dt>Maker</dt><dd>{{ item.maker || '—' }}</dd></div><div><dt>Model</dt><dd>{{ item.model || '—' }}</dd></div><div><dt>P/N</dt><dd>{{ item.partNo || '—' }}</dd></div><div><dt>S/N</dt><dd>{{ item.serialNo || '—' }}</dd></div><div><dt>Accessories</dt><dd>{{ item.accessories || '—' }}</dd></div></dl>
            </div>
            <div class="timeline-cell" :style="{ width: `${DAY_WIDTH * daysShown}px`, backgroundSize: `${DAY_WIDTH}px 100%` }">
              <span v-for="date in dates.filter(isWeekend)" :key="toIso(date)" class="weekend-column" :style="{ left: `${diffDays(date, rangeStart) * DAY_WIDTH}px`, width: `${DAY_WIDTH}px` }" />
              <button v-for="(booking, lane) in bookingsFor(item.id)" v-show="bookingVisible(booking)" :key="booking.id" class="booking-bar" :class="statusMeta[booking.status].className" :style="barStyle(booking, lane)" type="button" :aria-label="`查看 ${booking.title}`" @click="openBooking(booking)">
                <strong><span>[{{ statusMeta[booking.status].label }}]</span> {{ booking.title }}</strong>
                <small>客戶：{{ booking.customer }} · Demo：{{ booking.demoOwner }}</small>
                <small>{{ booking.start.replaceAll('-', '/') }} — {{ booking.end.replaceAll('-', '/') }}</small>
              </button>
            </div>
          </div>
          <div v-if="visibleEquipment.length === 0" class="empty-state">找不到符合的設備。</div>
        </div>
      </div>
    </section>

    <Transition name="toast"><div v-if="savedMessage" class="saved-toast"><CircleCheck />{{ savedMessage }}</div></Transition>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="dialogOpen" class="modal-overlay" @mousedown.self="closeDialog" @keydown.esc="closeDialog">
          <section class="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <button class="dialog-close" type="button" aria-label="關閉" @click="closeDialog"><X /></button>
            <header><h2 id="dialog-title">{{ editingId ? '編輯 Demo 預約' : '新增 Demo 預約' }}</h2><p>選擇設備與期間；系統會自動檢查預約衝突。</p></header>
            <form id="booking-form" class="booking-form" @submit.prevent="submitBooking">
              <label><span>設備</span><select v-model="form.equipmentId" class="control"><option v-for="item in equipment" :key="item.id" :value="item.id">{{ item.nameZh }} · {{ item.model }}</option></select></label>
              <label><span>Demo 主題</span><input v-model="form.title" class="control" placeholder="例：Demo 於 PSMC 8A" /></label>
              <div class="form-grid"><label><span>開始日期</span><input v-model="form.start" class="control" type="date" /></label><label><span>結束日期</span><input v-model="form.end" class="control" type="date" /></label></div>
              <div class="form-grid"><label><span>客戶名稱</span><input v-model="form.customer" class="control" /></label><label><span>聯絡窗口</span><input v-model="form.contact" class="control" /></label></div>
              <div class="form-grid"><label><span>申請者</span><input v-model="form.applicant" class="control" /></label><label><span>Demo 人員</span><input v-model="form.demoOwner" class="control" /></label></div>
              <label><span>狀態</span><select v-model="form.status" class="control"><option v-for="(meta, key) in statusMeta" :key="key" :value="key">{{ meta.label }}</option></select></label>
              <p v-if="error" class="form-error">{{ error }}</p>
            </form>
            <footer><button v-if="editingId" class="button button-danger delete-action" type="button" @click="deleteBooking"><Trash2 />刪除預約</button><button class="button button-outline" type="button" @click="closeDialog">取消</button><button class="button button-primary" form="booking-form" type="submit">{{ editingId ? '儲存變更' : '建立預約' }}</button></footer>
          </section>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="equipmentDialogOpen" class="modal-overlay" @mousedown.self="closeEquipmentDialog" @keydown.esc="closeEquipmentDialog">
          <section class="booking-dialog equipment-dialog" role="dialog" aria-modal="true" aria-labelledby="equipment-dialog-title">
            <button class="dialog-close" type="button" aria-label="關閉" @click="closeEquipmentDialog"><X /></button>
            <header><h2 id="equipment-dialog-title">{{ equipmentForm.id ? '編輯設備／分析項目' : '新增設備／分析項目' }}</h2><p>{{ equipmentForm.id ? '修改左側顯示名稱與設備明細。' : '建立新的分析項目與設備明細。' }}SharePoint 模式會直接寫回設備清單。</p></header>
            <form id="equipment-form" class="booking-form" @submit.prevent="submitEquipment">
              <label><span>設備英文名稱</span><input v-model="equipmentForm.name" class="control" placeholder="例：Nitrate Nitrogen" /></label>
              <label><span>中文分析項目</span><input v-model="equipmentForm.nameZh" class="control" placeholder="例：硝酸鹽氮" /></label>
              <div class="form-grid"><label><span>Maker／廠牌</span><input v-model="equipmentForm.maker" class="control" /></label><label><span>Model／型號</span><input v-model="equipmentForm.model" class="control" /></label></div>
              <div class="form-grid"><label><span>P/N／料號</span><input v-model="equipmentForm.partNo" class="control" /></label><label><span>S/N／序號</span><input v-model="equipmentForm.serialNo" class="control" /></label></div>
              <label><span>Accessories／配件</span><input v-model="equipmentForm.accessories" class="control" placeholder="例：Cable、Sensor、Mounting kit" /></label>
              <p v-if="equipmentError" class="form-error">{{ equipmentError }}</p>
            </form>
            <footer><button v-if="equipmentForm.id" class="button button-danger delete-action" type="button" @click="deleteEquipment"><Trash2 />刪除設備</button><button class="button button-outline" type="button" @click="closeEquipmentDialog">取消</button><button class="button button-primary" form="equipment-form" type="submit">{{ equipmentForm.id ? '儲存設備明細' : '新增設備' }}</button></footer>
          </section>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>
