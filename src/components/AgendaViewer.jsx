import { useState, useEffect } from 'react';
import { Clock, User, Calendar as CalendarIcon } from 'lucide-react';
import { getFullAgenda } from '../lib/api';
import { formatDate, formatTime, getGoogleDriveDirectLink } from '../lib/utils';

export default function AgendaViewer({ eventId }) {
    const [agenda, setAgenda] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(0);

    useEffect(() => {
        loadAgenda();
        // Reload every 30 seconds for real-time updates
        const interval = setInterval(loadAgenda, 30000);
        return () => clearInterval(interval);
    }, [eventId]);

    const loadAgenda = async () => {
        try {
            const data = await getFullAgenda(eventId);
            setAgenda(data);
            setLoading(false);
        } catch (error) {
            console.error('Error loading agenda:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                    <p className="text-gray-500 font-medium">الصبر جميل</p>
                </div>
            </div>
        );
    }

    if (!agenda || !agenda.event) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <CalendarIcon size={64} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-2xl text-gray-600">الأجندة غير موجودة</h2>
                </div>
            </div>
        );
    }

    const { event, days } = agenda;
    const currentDay = days[selectedDay];

    // Dynamic padding to prevent content from hiding behind fixed header/footer
    const paddingTop = event.header_image_url
        ? (event.header_height ? `calc(${event.header_height} + 2rem)` : 'pt-56 md:pt-72')
        : 'pt-12';
    const paddingBottom = event.footer_image_url ? 'pb-40 md:pb-56' : 'pb-12';

    return (
        <div
            className="min-h-screen bg-white"
            style={{
                backgroundImage: event.background_image_url
                    ? `url(${getGoogleDriveDirectLink(event.background_image_url)})`
                    : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
            }}
        >
            {/* Header Image - Fixed Top */}
            {event.header_image_url && (
                <div
                    className="fixed top-0 left-0 w-full bg-gray-100 overflow-hidden z-20 shadow-md"
                    style={{ height: event.header_height || '16rem' }} // Default to 16rem (h-64) if not set
                >
                    <img
                        src={getGoogleDriveDirectLink(event.header_image_url)}
                        alt="Header"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
            )}

            {/* Main Container - Scrollable */}
            <div
                className={`max-w-5xl mx-auto px-4 ${!paddingTop.startsWith('calc') ? paddingTop : ''} ${paddingBottom}`}
                style={{ paddingTop: paddingTop.startsWith('calc') ? paddingTop : undefined }}
            >
                {/* Days Tabs */}
                {days.length > 1 && (
                    <div className="flex justify-center gap-2 mb-12 flex-wrap">
                        {days.map((day, index) => (
                            <button
                                key={day.day_id}
                                onClick={() => setSelectedDay(index)}
                                className={`px-6 py-3 rounded-lg transition ${selectedDay === index
                                    ? 'bg-black text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="font-medium">{day.day_name}</div>
                                <div className="text-sm opacity-80">{formatDate(day.day_date, { month: 'short', day: 'numeric' })}</div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Single Day Header (if only one day) */}
                {days.length === 1 && (
                    <div className="text-center mb-12">
                        <h2 className="text-2xl font-light text-gray-800 mb-1">{currentDay.day_name}</h2>
                        <p className="text-gray-500">{formatDate(currentDay.day_date)}</p>
                    </div>
                )}

                {/* Agenda Slots */}
                <div className="space-y-4">
                    {currentDay?.slots?.length > 0 ? (
                        currentDay.slots.map((slot, index) => (
                            <div
                                key={slot.slot_id}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                            >
                                <div className="flex flex-col md:flex-row md:items-start gap-4">
                                    {/* Time */}
                                    <div className="flex items-center gap-2 text-gray-600 md:w-48 flex-shrink-0">
                                        <Clock size={18} />
                                        <span className="font-medium">
                                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-xl font-medium text-gray-900">
                                                {slot.slot_title}
                                            </h3>
                                            {slot.presenter_name && slot.show_presenter && (
                                                <span className="flex items-center gap-1 text-gray-600 text-sm font-normal bg-gray-100 px-2 py-1 rounded-full">
                                                    <User size={14} />
                                                    {slot.presenter_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 text-gray-400">
                            <CalendarIcon size={64} className="mx-auto mb-4 opacity-30" />
                            <p>لا توجد جلسات في هذا اليوم</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Image - Fixed Bottom */}
            {event.footer_image_url && (
                <div className="fixed bottom-0 left-0 w-full h-32 md:h-48 bg-gray-100 overflow-hidden z-20 shadow-inner-lg">
                    <img
                        src={getGoogleDriveDirectLink(event.footer_image_url)}
                        alt="Footer"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
            )}
        </div>
    );
}
