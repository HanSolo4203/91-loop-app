# 91 Loop App

A professional business application built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Next.js 14** with App Router for modern React development
- **TypeScript** for type safety and better developer experience
- **Tailwind CSS** with a professional business theme
- **Responsive Design** that works on all devices
- **Modern UI Components** built with accessibility in mind
- **Well-organized Architecture** with proper separation of concerns

## 🛠️ Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Font**: Inter (Google Fonts)
- **Package Manager**: npm

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── about/             # About page
│   ├── contact/           # Contact page
│   ├── services/          # Services page
│   ├── dashboard/         # Dashboard (protected)
│   ├── admin/             # Admin panel (protected)
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   │   ├── button/       # Button component
│   │   ├── input/        # Input component
│   │   ├── card/         # Card components
│   │   └── ...           # Other UI components
│   ├── forms/            # Form components
│   ├── layout/           # Layout components
│   └── navigation/       # Navigation components
├── lib/                  # Utility libraries
│   ├── utils/            # Utility functions
│   ├── hooks/            # Custom React hooks
│   └── constants/        # Application constants
└── types/                # TypeScript type definitions
    └── index.ts          # Main type definitions
```

## 🎨 Design System

The application uses a professional business color palette:

- **Primary**: Blue tones for main actions and branding
- **Secondary**: Gray tones for text and backgrounds
- **Accent**: Yellow tones for highlights and warnings
- **Success**: Green tones for positive actions
- **Warning**: Orange tones for caution
- **Error**: Red tones for errors and destructive actions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd 91-loop-app-v1
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint

## 🧩 Components

### UI Components

- **Button**: Customizable button with multiple variants and sizes
- **Input**: Form input with label, error states, and icons
- **Card**: Flexible card component with header, content, and footer
- **Modal**: Accessible modal dialog component
- **Table**: Data table with sorting and pagination
- **Badge**: Status and category badges
- **Alert**: Notification and alert messages

### Custom Hooks

- **useLocalStorage**: Manage localStorage with TypeScript support
- **useDebounce**: Debounce values for search and API calls

## 🔧 Configuration

### Tailwind CSS

The Tailwind configuration includes:
- Custom color palette for business applications
- Extended spacing and typography scales
- Custom animations and keyframes
- Professional shadows and border radius values

### TypeScript

- Strict type checking enabled
- Path aliases configured (`@/*` for `src/*`)
- Comprehensive type definitions for all components and utilities

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **sm**: 640px
- **md**: 768px  
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

## 🎯 Business Features

- **User Management**: Authentication and user profiles
- **Project Management**: Create and track projects
- **Task Management**: Organize and assign tasks
- **Company Profiles**: Manage company information
- **Dashboard**: Overview of key metrics and activities
- **Admin Panel**: Administrative functions and settings

## 🔒 Security

- Type-safe API routes
- Input validation and sanitization
- Secure authentication patterns
- CSRF protection
- XSS prevention

## 🚀 Deployment

The application is ready for deployment on:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- **Docker** containers

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Email: hello@91loopapp.com
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

---

Built with ❤️ using Next.js 14, TypeScript, and Tailwind CSS.