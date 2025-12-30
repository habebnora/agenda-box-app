import { useState, useEffect } from 'react';
import { Plus, Calendar, Edit2, Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getEvents, createEvent, deleteEvent } from '../lib/api';
import { formatDate } from '../lib/utils';

export default function Dashboard() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newEventName, setNewEventName] = useState('');
    const [createStatus, setCreateStatus] = useState('idle'); // idle, loading, success

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const data = await getEvents();
            setEvents(data || []);
        } catch (error) {
            console.error('Error loading events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async () => {
        if (!newEventName.trim()) return;

        try {
            setCreateStatus('loading');
            const data = await createEvent({ event_name: newEventName });

            setCreateStatus('success');
            // Wait a bit to show success message
            setTimeout(() => {
                setNewEventName('');
                setShowCreateModal(false);
                setCreateStatus('idle');
                if (data && data.event_id) {
                    navigate(`/event/${data.event_id}`);
                } else {
                    loadEvents();
                }
            }, 1500);
        } catch (error) {
            console.error('Error creating event:', error);
            setCreateStatus('idle');
            alert('حصل خطأ أثناء الإنشاء');
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!confirm('متأكد إنك عايز تمسح الـ Event ده؟')) return;

        try {
            await deleteEvent(eventId);
            loadEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    const handleEditEvent = (eventId) => {
        navigate(`/event/${eventId}`);
    };

    const [copiedId, setCopiedId] = useState(null);
    const handleCopyLink = (eventId) => {
        const url = `${window.location.origin}/#/agenda/${eventId}`;
        navigator.clipboard.writeText(url);
        setCopiedId(eventId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-light text-gray-900">Event Agenda Builder</h1>
                            <p className="text-gray-500 mt-1">إدارة الأجندات للفعاليات</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
                        >
                            <Plus size={20} />
                            <span>انشاء أجندة جديدة</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Events Grid */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                            <p className="text-gray-500 font-medium">الصبر جميل</p>
                        </div>
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-16">
                        <Calendar size={64} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl text-gray-600 mb-2">لا توجد فعاليات</h3>
                        <p className="text-gray-400">ابدأ بإنشاء فعالية جديدة</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event) => (
                            <div
                                key={event.event_id}
                                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                                            {event.event_name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {formatDate(event.created_at)}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs ${event.status === 'active'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {event.status}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEditEvent(event.event_id)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                                    >
                                        <Edit2 size={16} />
                                        <span>تعديل</span>
                                    </button>
                                    <a
                                        href={`/#/agenda/${event.event_id}`}
                                        target="_blank"
                                        className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                    <button
                                        onClick={() => handleCopyLink(event.event_id)}
                                        className={`flex items-center justify-center px-4 py-2 border rounded-lg transition ${copiedId === event.event_id
                                            ? 'bg-green-50 border-green-200 text-green-600'
                                            : 'border-gray-300 hover:bg-gray-50'
                                            }`}
                                        title="نسخ الرابط"
                                    >
                                        {copiedId === event.event_id ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteEvent(event.event_id)}
                                        className="flex items-center justify-center px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Event Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl scale-in-center">
                        {createStatus === 'idle' ? (
                            <>
                                <h3 className="text-2xl font-light mb-6 text-gray-900">انشاء أجندة جديدة</h3>
                                <input
                                    type="text"
                                    autoFocus
                                    value={newEventName}
                                    onChange={(e) => setNewEventName(e.target.value)}
                                    placeholder="اسم الفعالية..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-black transition"
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCreateEvent}
                                        className="flex-1 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition font-medium"
                                    >
                                        انشاء
                                    </button>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 bg-gray-100 text-gray-600 px-6 py-3 rounded-xl hover:bg-gray-200 transition font-medium"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center py-8">
                                {createStatus === 'loading' ? (
                                    <>
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
                                        <p className="text-lg font-medium text-gray-900">جاري انشاء الأجندة...</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                            <Check size={24} />
                                        </div>
                                        <p className="text-lg font-medium text-gray-900">تم انشاء الأجندة بنجاح!</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
