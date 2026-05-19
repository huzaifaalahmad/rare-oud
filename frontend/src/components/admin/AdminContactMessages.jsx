import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

const STATUSES = ['new', 'read', 'replied', 'archived'];

function t(lang, ar, en) {
  return lang === 'ar' ? ar : en;
}

function compact(value, max = 120) {
  if (!value) return '-';
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function replyStatusMessage(lang, data) {
  if (data?.email_reply_sent) {
    return t(
      lang,
      'تم حفظ الرد، وإنشاء إشعار للمستخدم، وإرسال نسخة بريدية بنجاح.',
      'Reply saved, user notification created, and email copy sent successfully.'
    );
  }

  if (data?.email_reply_queued) {
    return t(
      lang,
      'تم حفظ الرد وإنشاء إشعار للمستخدم. البريد في قائمة الإرسال وينتظر عامل البريد.',
      'Reply saved and user notification created. The email is queued and waiting for the email worker.'
    );
  }

  if (data?.email_reply_scheduled) {
    return t(
      lang,
      'تم حفظ الرد وإنشاء إشعار للمستخدم. سيتم إرسال نسخة البريد بالخلفية خلال لحظات.',
      'Reply saved and user notification created. The email copy will be sent in the background shortly.'
    );
  }

  if (data?.email_delivery_configured) {
    return t(
      lang,
      'تم حفظ الرد وإنشاء إشعار للمستخدم، لكن تعذر تأكيد إرسال البريد.',
      'Reply saved and user notification created, but email delivery could not be confirmed.'
    );
  }

  return t(
    lang,
    'تم حفظ الرد وإنشاء إشعار للمستخدم. البريد غير مفعّل حاليًا.',
    'Reply saved and user notification created. Email sending is not configured.'
  );
}

export default function AdminContactMessages() {
  const { lang } = useLanguage();
  const [items, setItems] = useState([]);
  const [replies, setReplies] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState({ limit: 50, offset: 0, total: 0 });
  const [state, setState] = useState({ loading: true, error: '', message: '' });

  async function load(nextOffset = page.offset, nextStatus = statusFilter) {
    setState(current => ({ ...current, loading: true, error: '' }));
    const { data } = await api.get('/contact-messages/admin', {
      params: {
        limit: page.limit,
        offset: nextOffset,
        status: nextStatus || undefined
      }
    });
    const list = data.messages || [];
    setItems(list);
    setReplies(list.reduce((acc, item) => ({ ...acc, [item.id]: item.admin_reply || '' }), {}));
    setPage(current => ({ ...current, offset: nextOffset, total: Number(data.total || 0) }));
    setState(current => ({ ...current, loading: false }));
  }

  useEffect(() => {
    load(0).catch(error => setState({
      loading: false,
      error: error.response?.data?.message || t(lang, 'تعذر تحميل رسائل التواصل', 'Unable to load contact messages'),
      message: ''
    }));
  }, []);

  async function changeFilter(value) {
    setStatusFilter(value);
    await load(0, value);
  }

  async function update(item, status) {
    setState(current => ({ ...current, error: '', message: '' }));
    try {
      const admin_reply = replies[item.id] || '';
      const { data } = await api.patch(`/contact-messages/${item.id}`, { status, admin_reply });
      setItems(list => list.map(row => row.id === item.id ? {
        ...row,
        status: admin_reply ? 'replied' : status,
        admin_reply
      } : row));
      setState(current => ({
        ...current,
        message: admin_reply
          ? replyStatusMessage(lang, data)
          : t(lang, 'تم تحديث حالة الرسالة.', 'Message status updated.')
      }));
    } catch (error) {
      setState(current => ({
        ...current,
        error: error.response?.data?.message || t(lang, 'تعذر تحديث الرسالة', 'Unable to update message')
      }));
    }
  }

  async function remove(item) {
    if (!window.confirm(t(lang, 'حذف رسالة التواصل؟', 'Delete contact message?'))) return;
    setState(current => ({ ...current, error: '', message: '' }));
    try {
      await api.delete(`/contact-messages/${item.id}`);
      setItems(list => list.filter(row => row.id !== item.id));
      setState(current => ({ ...current, message: t(lang, 'تم حذف الرسالة.', 'Message deleted.') }));
    } catch (error) {
      setState(current => ({
        ...current,
        error: error.response?.data?.message || t(lang, 'تعذر حذف الرسالة', 'Unable to delete message')
      }));
    }
  }

  const canPrev = page.offset > 0;
  const canNext = page.offset + page.limit < page.total;

  return (
    <div className="admin-stack">
      <div className="admin-header-row">
        <div>
          <h2>{t(lang, 'رسائل التواصل', 'Contact Messages')}</h2>
          <p className="muted">{t(lang, 'الرسائل المرسلة من صفحة تواصل معنا تظهر هنا مع إمكانية الرد داخل الموقع وبالبريد.', 'Messages from the contact page appear here with in-site and email reply support.')}</p>
        </div>
        <label className="admin-inline-filter">
          {t(lang, 'الحالة', 'Status')}
          <select value={statusFilter} onChange={e => changeFilter(e.target.value)}>
            <option value="">{t(lang, 'الكل', 'All')}</option>
            {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>

      {state.error && <p className="error-box">{state.error}</p>}
      {state.message && <p className="success-box">{state.message}</p>}

      {state.loading ? <p>{t(lang, 'جاري التحميل...', 'Loading...')}</p> : (
        <div className="table-wrap">
          <table className="table admin-contact-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t(lang, 'المرسل', 'Sender')}</th>
                <th>{t(lang, 'الموضوع', 'Subject')}</th>
                <th>{t(lang, 'الرسالة', 'Message')}</th>
                <th>{t(lang, 'الرد', 'Reply')}</th>
                <th>{t(lang, 'الحالة', 'Status')}</th>
                <th>{t(lang, 'التاريخ', 'Created')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>
                    <strong>{item.name}</strong>
                    <br />
                    <small>{item.account_email || item.email || '-'}</small>
                    {item.phone && <><br /><small>{item.phone}</small></>}
                  </td>
                  <td>{item.subject || '-'}</td>
                  <td title={item.message || ''}>{compact(item.message)}</td>
                  <td>
                    <textarea
                      rows="3"
                      value={replies[item.id] ?? ''}
                      onChange={e => setReplies(current => ({ ...current, [item.id]: e.target.value }))}
                      placeholder={t(lang, 'اكتب رد الإدارة...', 'Write admin reply...')}
                      dir="auto"
                    />
                  </td>
                  <td>
                    <select value={item.status} onChange={e => update(item, e.target.value)}>
                      {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <button className="icon-btn" type="button" onClick={() => remove(item)}>
                      {t(lang, 'حذف', 'Delete')}
                    </button>
                    <button className="icon-btn" type="button" onClick={() => update(item, replies[item.id] ? 'replied' : item.status)}>
                      {t(lang, 'حفظ', 'Save')}
                    </button>
                  </td>
                  <td>{new Date(item.created_at).toLocaleString(lang === 'ar' ? 'ar' : 'en')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <p className="muted">{t(lang, 'لا توجد رسائل حاليًا.', 'No messages yet.')}</p>}
        </div>
      )}

      <div className="actions-row">
        <button className="icon-btn" disabled={!canPrev} onClick={() => load(Math.max(page.offset - page.limit, 0))}>{t(lang, 'السابق', 'Prev')}</button>
        <span>{page.total ? page.offset + 1 : 0}-{Math.min(page.offset + page.limit, page.total)} / {page.total}</span>
        <button className="icon-btn" disabled={!canNext} onClick={() => load(page.offset + page.limit)}>{t(lang, 'التالي', 'Next')}</button>
      </div>
    </div>
  );
}
