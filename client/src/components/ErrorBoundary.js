import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Bir hata olduğunda state'i günceller.
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("Yakalanan hata:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return <h2>Bir hata oluştu. Lütfen daha sonra tekrar deneyin.</h2>;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
