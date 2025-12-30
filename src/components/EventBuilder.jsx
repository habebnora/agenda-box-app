import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Upload, Calendar, Clock, User, Save, ExternalLink, Edit2, UserCheck, UserX, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    getEventDays,
    getAgendaSlots,
    createDay,
    createSlot,
    updateSlot,
    updateDay,
    deleteDay,
    deleteSlot,
    updateEvent,
    getEvent
} from '../lib/api';
import { formatDate, formatTime, getGoogleDriveDirectLink } from '../lib/utils';

export default function EventBuilder({ event, onBack }) {
    const navigate = useNavigate();
    const [days, setDays] = useState([]);
    const [slots, setSlots] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('days');
    const [isSubmittingDay, setIsSubmittingDay] = useState(false);

    const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
        const hours = Math.floor(i / 2).toString().padStart(2, '0');
        const minutes = (i % 2 === 0 ? '00' : '30');
        return `${hours}:${minutes}`;
    });

    // Form states
    const [newDayName, setNewDayName] = useState('');
    const [newDayDate, setNewDayDate] = useState('');
    const [selectedDay, setSelectedDay] = useState(null);
    const [dayError, setDayError] = useState(false);

    const [slotModal, setSlotModal] = useState({
        show: false,
        isEditing: false,
        slotId: null,
        dayId: null,
        startTime: '09:00',
        endTime: '10:00',
        title: '',
        presenter: '',
        saving: false
    });
    const [eventDetails, setEventDetails] = useState(event);
    const [imageUrls, setImageUrls] = useState({
        header: event.header_image_url || '',
        height: event.header_height || '',
        background: event.background_image_url || '',
        footer: event.footer_image_url || ''
    });

    // Handle updates to eventDetails
    useEffect(() => {
        if (eventDetails) {
            setImageUrls({
                header: eventDetails.header_image_url || '',
                height: eventDetails.header_height || '',
                background: eventDetails.background_image_url || '',
                footer: eventDetails.footer_image_url || ''
            });
        }
    }, [eventDetails?.event_id, eventDetails?.header_image_url]);

    // Day Editing State
    const [editingDayId, setEditingDayId] = useState(null);
    const [editDayName, setEditDayName] = useState('');
    const [editDayDate, setEditDayDate] = useState('');

    useEffect(() => {
        loadEventData();
    }, [event.event_id]);

    const loadEventData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            // If we don't have full event details, fetch them
            if (!eventDetails.event_name) {
                const fullEvent = await getEvent(event.event_id);
                if (fullEvent) setEventDetails(fullEvent);
            }

            const daysData = await getEventDays(event.event_id);
            setDays(daysData || []);

            // Load slots for all days in parallel
            if (daysData && daysData.length > 0) {
                const slotsPromises = daysData.map(day => getAgendaSlots(day.day_id));
                const allSlots = await Promise.all(slotsPromises);

                const slotsData = {};
                daysData.forEach((day, index) => {
                    slotsData[day.day_id] = allSlots[index] || [];
                });
                setSlots(slotsData);
            }
        } catch (error) {
            console.error('Error loading event data:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleAddDay = async () => {
        if (!newDayName.trim()) {
            setDayError(true);
            setTimeout(() => setDayError(false), 3000);
            return;
        }
        if (!newDayDate) return;

        try {
            setIsSubmittingDay(true);
            await createDay({
                event_id: event.event_id,
                day_number: days.length + 1,
                day_name: newDayName,
                day_date: newDayDate
            });
            setNewDayName('');
            setNewDayDate('');
            setDayError(false);
            await loadEventData(true);
        } catch (error) {
            console.error('Error adding day:', error);
        } finally {
            setIsSubmittingDay(false);
        }
    };

    const handleOpenSlotModal = (dayId) => {
        setSlotModal({
            show: true,
            isEditing: false,
            slotId: null,
            dayId,
            startTime: '09:00',
            endTime: '10:00',
            title: '',
            presenter: '',
            saving: false
        });
    };

    const handleEditSlot = (slot) => {
        setSlotModal({
            show: true,
            isEditing: true,
            slotId: slot.slot_id,
            dayId: slot.day_id,
            startTime: slot.start_time,
            endTime: slot.end_time,
            title: slot.slot_title,
            presenter: slot.presenter_name || '',
            saving: false
        });
    };

    const handleSaveSlot = async () => {
        const { dayId, startTime, endTime, title, presenter, isEditing, slotId } = slotModal;
        if (!startTime || !endTime || !title) return;

        try {
            setSlotModal(prev => ({ ...prev, saving: true }));

            // Optimistic Update
            if (isEditing) {
                setSlots(prev => ({
                    ...prev,
                    [dayId]: prev[dayId].map(s => s.slot_id === slotId ? {
                        ...s,
                        start_time: startTime,
                        end_time: endTime,
                        slot_title: title,
                        presenter_name: presenter
                    } : s)
                }));
            } else {
                const tempId = `temp-${Date.now()}`;
                const newSlot = {
                    slot_id: tempId,
                    day_id: dayId,
                    start_time: startTime,
                    end_time: endTime,
                    slot_title: title,
                    presenter_name: presenter,
                    show_presenter: true,
                    isOptimistic: true
                };
                setSlots(prev => ({
                    ...prev,
                    [dayId]: [...(prev[dayId] || []), newSlot].sort((a, b) => a.start_time.localeCompare(b.start_time))
                }));
            }

            if (isEditing) {
                await updateSlot(slotId, {
                    start_time: startTime,
                    end_time: endTime,
                    slot_title: title,
                    presenter_name: presenter
                });
            } else {
                await createSlot({
                    day_id: dayId,
                    start_time: startTime,
                    end_time: endTime,
                    slot_title: title,
                    presenter_name: presenter,
                    sort_order: (slots[dayId]?.length || 0) + 1
                });
            }

            setSlotModal(prev => ({ ...prev, show: false, saving: false }));
            // Sync with real data in background
            loadEventData(true);
        } catch (error) {
            console.error('Error saving slot:', error);
            setSlotModal(prev => ({ ...prev, saving: false }));
            alert('حدث خطأ أثناء الحفظ');
        }
    };

    const handleDeleteDay = async (dayId) => {
        if (!confirm('متأكد إنك عايز تمسح اليوم ده؟')) return;

        try {
            await deleteDay(dayId);
            loadEventData();
        } catch (error) {
            console.error('Error deleting day:', error);
        }
    };

    const handleDeleteSlot = async (slotId) => {
        if (!confirm('متأكد إنك عايز تمسح الـ Slot ده؟')) return;

        try {
            await deleteSlot(slotId);
            loadEventData();
        } catch (error) {
            console.error('Error deleting slot:', error);
        }
    };

    const handleSaveImages = async () => {
        try {
            await updateEvent(event.event_id, {
                header_image_url: imageUrls.header,
                header_height: imageUrls.height,
                background_image_url: imageUrls.background,
                footer_image_url: imageUrls.footer
            });
            alert('تم حفظ الصور بنجاح! ✅');
        } catch (error) {
            console.error('Error saving images:', error);
            alert('حصل خطأ في الحفظ');
        }
    };

    const handleStartEditDay = (day) => {
        setEditingDayId(day.day_id);
        setEditDayName(day.day_name);
        setEditDayDate(day.day_date);
    };

    const handleUpdateDay = async () => {
        if (!editDayName.trim() || !editDayDate) return;

        try {
            await updateDay(editingDayId, {
                day_name: editDayName,
                day_date: editDayDate
            });
            setEditingDayId(null);
            loadEventData();
        } catch (error) {
            console.error('Error updating day:', error);
        }
    };

    const handleTogglePresenter = async (slot) => {
        try {
            const newStatus = !slot.show_presenter;
            // Optimistic update
            const updatedSlots = { ...slots };
            const daySlots = updatedSlots[slot.day_id].map(s =>
                s.slot_id === slot.slot_id ? { ...s, show_presenter: newStatus } : s
            );
            updatedSlots[slot.day_id] = daySlots;
            setSlots(updatedSlots);

            await updateSlot(slot.slot_id, { show_presenter: newStatus });
        } catch (error) {
            console.error('Error toggling presenter:', error);
            loadEventData(); // Revert on error
        }
    };

    const agendaUrl = `${window.location.origin}/#/agenda/${event.event_id}`;

    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(agendaUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                    <p className="text-gray-500 font-medium">الصبر جميل</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-light text-gray-900 truncate max-w-[300px]">
                                    {eventDetails.event_name || '...'}
                                </h1>
                                <p className="text-gray-500 text-sm">تعديل الأجندة</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopy}
                                className={`flex items-center gap-2 px-6 py-3 border rounded-lg transition ${copied
                                    ? 'bg-green-50 border-green-200 text-green-600'
                                    : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                {copied ? <Check size={20} /> : <Copy size={20} />}
                                <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
                            </button>
                            <a
                                href={agendaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                            >
                                <ExternalLink size={20} />
                                <span>عرض الأجندة</span>
                            </a>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 mt-6 border-b">
                        <button
                            onClick={() => setActiveTab('days')}
                            className={`pb-3 px-4 border-b-2 transition ${activeTab === 'days'
                                ? 'border-black text-black'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            الأيام والـ Slots
                        </button>
                        <button
                            onClick={() => setActiveTab('images')}
                            className={`pb-3 px-4 border-b-2 transition ${activeTab === 'images'
                                ? 'border-black text-black'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            الصور
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {activeTab === 'days' && (
                    <div className="space-y-6">
                        {/* Add Day Form */}
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-medium mb-4">إضافة يوم جديد</h3>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-4">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={newDayName}
                                            onChange={(e) => {
                                                setNewDayName(e.target.value);
                                                if (e.target.value.trim()) setDayError(false);
                                            }}
                                            placeholder="اسم اليوم (مثال: Day 1)"
                                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${dayError ? 'border-red-500 focus:ring-red-200' : 'focus:ring-black'
                                                }`}
                                        />
                                        {dayError && (
                                            <p className="text-red-500 text-xs mt-1 absolute -bottom-5 right-0">اكتب اسم اليوم لتتمكن من اضافته</p>
                                        )}
                                    </div>
                                    <input
                                        type="date"
                                        value={newDayDate}
                                        onChange={(e) => setNewDayDate(e.target.value)}
                                        className="px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                    <button
                                        onClick={handleAddDay}
                                        disabled={isSubmittingDay}
                                        className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition flex items-center justify-center gap-2 h-[48px] min-w-[100px]"
                                    >
                                        {isSubmittingDay ? (
                                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                        ) : (
                                            <>
                                                <Plus size={20} />
                                                <span>إضافة</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Days List */}
                        {days.map((day) => (
                            <div key={day.day_id} className="bg-white rounded-lg border p-6">
                                <div className="flex items-center justify-between mb-4">
                                    {editingDayId === day.day_id ? (
                                        <div className="flex flex-1 gap-2 items-center">
                                            <input
                                                type="text"
                                                value={editDayName}
                                                onChange={(e) => setEditDayName(e.target.value)}
                                                className="border rounded px-2 py-1"
                                                autoFocus
                                            />
                                            <input
                                                type="date"
                                                value={editDayDate.split('T')[0]}
                                                onChange={(e) => setEditDayDate(e.target.value)}
                                                className="border rounded px-2 py-1"
                                            />
                                            <button
                                                onClick={handleUpdateDay}
                                                className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                            >
                                                <Save size={16} />
                                            </button>
                                            <button
                                                onClick={() => setEditingDayId(null)}
                                                className="p-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-medium">{day.day_name}</h3>
                                                <button
                                                    onClick={() => handleStartEditDay(day)}
                                                    className="text-gray-400 hover:text-black transition"
                                                    title="تعديل اليوم"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                            <p className="text-gray-500 text-sm">{formatDate(day.day_date)}</p>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenSlotModal(day.day_id)}
                                            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
                                        >
                                            <Plus size={16} />
                                            إضافة Slot
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDay(day.day_id)}
                                            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Slots */}
                                <div className="space-y-2">
                                    {slots[day.day_id]?.length > 0 ? (
                                        slots[day.day_id].map((slot) => (
                                            <div
                                                key={slot.slot_id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                                                    {/* Time */}
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 min-w-[140px]">
                                                        <Clock size={14} />
                                                        <span className="whitespace-nowrap">
                                                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                                        </span>
                                                    </div>

                                                    {/* Title */}
                                                    <div className="flex-1 min-w-[200px]">
                                                        <p className="font-medium text-gray-900">{slot.slot_title}</p>
                                                    </div>

                                                    {/* Presenter */}
                                                    <div className="flex-1 min-w-[150px]">
                                                        {slot.presenter_name && (
                                                            <p className="text-sm text-gray-600 flex items-center gap-1">
                                                                <User size={14} />
                                                                {slot.presenter_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {slot.presenter_name && (
                                                        <button
                                                            onClick={() => handleTogglePresenter(slot)}
                                                            className={`p-2 rounded-lg transition border ${slot.show_presenter
                                                                ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100'
                                                                : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                                }`}
                                                            title={slot.show_presenter ? 'إخفاء اسم المحاضر' : 'إظهار اسم المحاضر'}
                                                        >
                                                            {slot.show_presenter ? <UserCheck size={18} /> : <UserX size={18} />}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleEditSlot(slot)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-200"
                                                        title="تعديل"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSlot(slot.slot_id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-200"
                                                        title="حذف"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 text-center py-8">لا توجد Slots</p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {days.length === 0 && (
                            <div className="text-center py-16 text-gray-400">
                                <Calendar size={64} className="mx-auto mb-4 opacity-30" />
                                <p>ابدأ بإضافة أيام الفعالية</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'images' && (
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-medium mb-2">روابط الصور من Google Drive</h3>
                        <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-6 text-sm">
                            ⚠️ <strong>مهم جداً:</strong> لازم تتأكد إن إعدادات المشاركة للصورة في جوجل درايف معمولة:
                            <br />
                            <strong>General access: Anyone with the link</strong> (أي حد معاه الرابط)
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    رابط صورة الـ Header
                                </label>
                                <input
                                    type="url"
                                    value={imageUrls.header}
                                    onChange={(e) => setImageUrls({ ...imageUrls, header: e.target.value })}
                                    placeholder="https://drive.google.com/..."
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                />
                                {imageUrls.header && (
                                    <div className="mt-2 h-32 bg-gray-100 rounded-lg overflow-hidden border">
                                        <img
                                            src={getGoogleDriveDirectLink(imageUrls.header)}
                                            alt="Header Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ارتفاع الكوفر (اختياري)
                                </label>
                                <input
                                    type="text"
                                    value={imageUrls.height}
                                    onChange={(e) => setImageUrls({ ...imageUrls, height: e.target.value })}
                                    placeholder="مثال: 300px أو 50vh"
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                />
                                <p className="text-xs text-gray-500 mt-1">سيبها فاضية لو عايز الارتفاع الافتراضي</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    رابط صورة الـ Background
                                </label>
                                <input
                                    type="url"
                                    value={imageUrls.background}
                                    onChange={(e) => setImageUrls({ ...imageUrls, background: e.target.value })}
                                    placeholder="https://drive.google.com/..."
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                />
                                {imageUrls.background && (
                                    <div className="mt-2 h-32 bg-gray-100 rounded-lg overflow-hidden border">
                                        <img
                                            src={getGoogleDriveDirectLink(imageUrls.background)}
                                            alt="Background Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    رابط صورة الـ Footer
                                </label>
                                <input
                                    type="url"
                                    value={imageUrls.footer}
                                    onChange={(e) => setImageUrls({ ...imageUrls, footer: e.target.value })}
                                    placeholder="https://drive.google.com/..."
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                />
                                {imageUrls.footer && (
                                    <div className="mt-2 h-24 bg-gray-100 rounded-lg overflow-hidden border">
                                        <img
                                            src={getGoogleDriveDirectLink(imageUrls.footer)}
                                            alt="Footer Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleSaveImages}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                            >
                                <Save size={20} />
                                حفظ الصور
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Slot Addition/Edit Modal */}
            {slotModal.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl scale-in-center">
                        <h3 className="text-2xl font-light mb-6 text-gray-900">
                            {slotModal.isEditing ? 'تعديل Slot' : 'إضافة Slot جديد'}
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">من</label>
                                    <select
                                        value={slotModal.startTime}
                                        onChange={(e) => setSlotModal({ ...slotModal, startTime: e.target.value })}
                                        className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white"
                                    >
                                        {TIME_OPTIONS.map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">إلى</label>
                                    <select
                                        value={slotModal.endTime}
                                        onChange={(e) => setSlotModal({ ...slotModal, endTime: e.target.value })}
                                        className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white"
                                    >
                                        {TIME_OPTIONS.map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">العنوان</label>
                                <input
                                    type="text"
                                    value={slotModal.title}
                                    onChange={(e) => setSlotModal({ ...slotModal, title: e.target.value })}
                                    placeholder="مثال: Keynote Session"
                                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">المحاضر (اختياري)</label>
                                <input
                                    type="text"
                                    value={slotModal.presenter}
                                    onChange={(e) => setSlotModal({ ...slotModal, presenter: e.target.value })}
                                    placeholder="اسم المحاضر"
                                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={handleSaveSlot}
                                disabled={slotModal.saving}
                                className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium flex items-center justify-center gap-2"
                            >
                                {slotModal.saving ? (
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                    slotModal.isEditing ? 'حفظ التعديلات' : 'حفظ الـ Slot'
                                )}
                            </button>
                            <button
                                onClick={() => setSlotModal({ ...slotModal, show: false })}
                                disabled={slotModal.saving}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition font-medium"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
