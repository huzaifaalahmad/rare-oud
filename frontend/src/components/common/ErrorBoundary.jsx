import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('Rare Oud UI boundary caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page shell" role="alert" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
          <section className="card" style={{ maxWidth: 560, textAlign: 'center' }}>
            <p className="eyebrow">Rare Oud</p>
            <h1>تعذر عرض هذا الجزء / Something went wrong</h1>
            <p className="muted">قم بتحديث الصفحة. إذا استمرت المشكلة، تواصل مع الدعم.</p>
            <button className="btn primary" type="button" onClick={() => window.location.reload()}>
              تحديث الصفحة / Reload
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
