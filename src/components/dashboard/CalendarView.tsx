import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Appointment } from '../../types/dashboard';

interface CalendarViewProps {
  appointments: Appointment[];
  userId: string;
}

export default function CalendarView({ appointments, userId }: CalendarViewProps) {
  const calendarEvents = appointments.map(apt => {
    const isOrganizer = apt.userId === userId;
    return {
      id: apt.id,
      title: `${isOrganizer ? '📤' : '📥'} ${isOrganizer ? apt.targetUserName : apt.userName} - ${apt.description}`,
      start: `${format(apt.date, 'yyyy-MM-dd')}T${apt.time}`,
      className: isOrganizer ? 'bg-blue-600' : 'bg-green-600',
      extendedProps: {
        type: isOrganizer ? 'organized' : 'received'
      }
    };
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Calendar</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span className="text-gray-600 dark:text-gray-300">Organized by you</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span className="text-gray-600 dark:text-gray-300">Scheduled with you</span>
          </div>
        </div>
      </div>
      <div className="fc-custom-styles dark:fc-custom-styles-dark">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={calendarEvents}
          height="600px"
          eventContent={({ event }) => ({
            html: `<div class="fc-content">
              <div class="text-sm font-medium">${event.title}</div>
              <div class="text-xs opacity-75">
                ${event.extendedProps.type === 'organized' ? 'Organized by you' : 'Scheduled with you'}
              </div>
            </div>`
          })}
        />
      </div>
    </div>
  );
}