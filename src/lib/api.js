import axios from 'axios';

// حط الـ Apps Script URL هنا
const API_URL = 'https://script.google.com/macros/s/AKfycby09PfH6Ec5h318zzswkBTYVamxvhyiSEePDgzTLh9mOgfmkNlEbPcRJo3Z-kWzXhnrlg/exec';

// Helper function للـ GET requests
export const apiGet = async (action, params = {}) => {
    try {
        const response = await axios.get(API_URL, {
            params: { action, ...params }
        });
        return response.data;
    } catch (error) {
        console.error('API GET Error:', error);
        throw error;
    }
};

// Helper function للـ POST requests
export const apiPost = async (data) => {
    try {
        const response = await axios.post(API_URL, data, {
            headers: {
                'Content-Type': 'text/plain',
            }
        });
        return response.data;
    } catch (error) {
        console.error('API POST Error:', error);
        throw error;
    }
};

// ==========================================
// EVENT APIs
// ==========================================

export const getEvents = () => apiGet('getEvents');

export const getEvent = (eventId) => apiGet('getEvent', { eventId });

export const getFullAgenda = (eventId) => apiGet('getFullAgenda', { eventId });

export const createEvent = (eventData) => apiPost({
    action: 'createEvent',
    event_name: eventData.event_name,
    header_image_url: eventData.header_image_url || '',
    background_image_url: eventData.background_image_url || '',
    footer_image_url: eventData.footer_image_url || ''
});

export const updateEvent = (eventId, updates) => apiPost({
    action: 'updateEvent',
    event_id: eventId,
    updates
});

export const deleteEvent = (eventId) => apiPost({
    action: 'deleteEvent',
    event_id: eventId
});

// ==========================================
// DAY APIs
// ==========================================

export const getEventDays = (eventId) => apiGet('getEventDays', { eventId });

export const createDay = (dayData) => apiPost({
    action: 'createDay',
    event_id: dayData.event_id,
    day_number: dayData.day_number,
    day_name: dayData.day_name,
    day_date: dayData.day_date
});

export const updateDay = (dayId, updates) => apiPost({
    action: 'updateDay',
    day_id: dayId,
    updates
});

export const deleteDay = (dayId) => apiPost({
    action: 'deleteDay',
    day_id: dayId
});

// ==========================================
// SLOT APIs
// ==========================================

export const getAgendaSlots = (dayId) => apiGet('getAgendaSlots', { dayId });

export const createSlot = (slotData) => apiPost({
    action: 'createSlot',
    day_id: slotData.day_id,
    start_time: slotData.start_time,
    end_time: slotData.end_time,
    slot_title: slotData.slot_title,
    presenter_name: slotData.presenter_name || '',
    sort_order: slotData.sort_order || 999
});

export const updateSlot = (slotId, updates) => apiPost({
    action: 'updateSlot',
    slot_id: slotId,
    updates
});

export const deleteSlot = (slotId) => apiPost({
    action: 'deleteSlot',
    slot_id: slotId
});
