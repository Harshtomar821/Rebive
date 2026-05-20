# Revibe 🎉

A modern, feature-rich social media application built with cutting-edge web technologies. Connect with friends, share moments, chat in real-time, and interact with AI-powered chatbots.

## 🚀 Features

### Core Social Features

- **User Authentication** - Secure authentication powered by Clerk
- **Social Feed** - Create, view, and interact with posts from users you follow
- **Posts & Comments** - Share content with images and engage with community
- **Like System** - Express appreciation for content with likes
- **User Profiles** - Customizable profiles with bio, location, website, and profile pictures
- **Follow System** - Follow/unfollow users to curate your feed

### Real-Time Communication

- **Instant Messaging** - Real-time chat powered by Stream Chat API
- **Video Calls** - One-on-one video calling capabilities with Stream Video SDK
- **Online Status** - See when friends are online

### AI Features

- **AI Chatbots** - Interact with three unique AI personalities powered by Gemini API
  - **Sora** - Cheerful, playful, and funny AI companion
  - **Ram** - Calm, wise, and logical assistant
  - **Somya** - Empathetic, caring, and supportive friend

### User Experience

- **Smart Notifications** - Get notified for likes, comments, and follows
- **Dark/Light Theme** - Toggle between light and dark modes
- **Responsive Design** - Seamless experience on desktop, tablet, and mobile
- **File Uploads** - Share images with posts via UploadThing
- **Real-time Updates** - Automatic cache revalidation for fresh content

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 14.2 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **UI Components**: Radix UI
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend & Database

- **ORM**: Prisma Client
- **Database**: PostgreSQL
- **Authentication**: Clerk
- **Real-time Chat**: Stream Chat SDK
- **Video Streaming**: Stream Video React SDK
- **File Uploads**: UploadThing
- **AI Integration**: Google Gemini API

### Tools & Libraries

- **Notifications**: React Hot Toast
- **Theme Management**: next-themes
- **Utilities**: clsx, class-variance-authority, tailwind-merge
- **Date Handling**: date-fns
- **Environment**: dotenv

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Clerk account for authentication
- Stream Chat API key
- Stream Video API key
- Google Gemini API key
- UploadThing credentials (optional, for file uploads)

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd revibe
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/revibe

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Stream Chat
NEXT_PUBLIC_STREAM_API_KEY=your_stream_key
STREAM_SECRET_KEY=your_stream_secret

# Google Gemini
Gemini_Api=your_gemini_api_key

# UploadThing (Optional)
UPLOADTHING_SECRET=your_uploadthing_secret
NEXT_PUBLIC_UPLOADTHING_APP_ID=your_uploadthing_app_id
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) View database with Prisma Studio
npx prisma studio
```

### 5. Start Development Server

```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` to see your application.

## 📁 Project Structure

```
revibe/
├── src/
│   ├── actions/              # Server actions for backend operations
│   │   ├── post.action.ts    # Post CRUD operations
│   │   ├── chat.action.ts    # Chat functionality
│   │   ├── user.action.ts    # User operations
│   │   ├── gemini.action.ts  # AI bot responses
│   │   ├── stream.action.ts  # Stream tokens
│   │   ├── notifications.action.ts
│   │   └── ...
│   ├── app/                  # Next.js app directory
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home feed
│   │   ├── api/              # API routes
│   │   ├── chat/             # Chat pages
│   │   ├── ai-chat/          # AI chatbot pages
│   │   ├── call/             # Video call pages
│   │   ├── profile/          # User profiles
│   │   ├── notifications/    # Notifications page
│   │   └── ...
│   ├── components/           # React components
│   │   ├── PostCard.tsx      # Post display component
│   │   ├── CreatePost.tsx    # Post creation form
│   │   ├── ChatLoader.tsx    # Loading states
│   │   ├── NavBar.tsx        # Navigation
│   │   ├── Sidebar.tsx       # Sidebar navigation
│   │   └── ui/               # Reusable UI components
│   ├── lib/                  # Utility functions
│   │   ├── prisma.ts         # Prisma client
│   │   ├── stream.ts         # Stream utilities
│   │   ├── uploadthing.ts    # Upload handling
│   │   └── utils.ts          # Helper functions
│   ├── middleware.ts         # Next.js middleware
│   └── generated/            # Prisma generated files
├── prisma/
│   └── schema.prisma        # Database schema
├── public/                   # Static assets
├── next.config.mjs          # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS config
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies
```

## 📊 Database Schema

### User

- Stores user profile information
- Authenticated via Clerk (clerkId)
- Relationships: posts, comments, likes, followers, following, notifications

### Post

- Content with optional images
- Author relationship with cascade delete
- Associations: comments, likes, notifications

### Comment

- User comments on posts
- Indexed for performance (authorId, postId)
- Cascade delete behavior

### Like

- Unique constraint preventing duplicate likes
- Composite key on userId and postId
- Indexed for efficient queries

### Follows

- Manages follower/following relationships
- Composite primary key prevents duplicate follows
- Self-referencing relationships

### Notification

- Types: LIKE, COMMENT, FOLLOW
- Tracks read status
- Linked to posts or comments when relevant

## 🚀 Available Scripts

```bash
# Development
npm run dev              # Start development server

# Production
npm run build            # Build for production
npm start                # Start production server

# Maintenance
npm run lint             # Run ESLint
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Create & run migrations
npx prisma studio      # Open Prisma Studio UI
```

## 🎨 Theme & Styling

- Built with **Tailwind CSS** for utility-first styling
- **DaisyUI** components for enhanced UI
- **Dark mode** support with next-themes
- Custom color scheme with CSS variables
- Responsive grid system (mobile-first approach)

## 🔐 Security Features

- **Authentication**: Secure user authentication via Clerk
- **Authorization**: Protected routes and API endpoints
- **Database**: PostgreSQL with Prisma for secure queries
- **Cascade Deletes**: Automatic cleanup of related records
- **Unique Constraints**: Prevent duplicate likes and follows

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Deploy to Other Platforms

Ensure your platform supports:

- Node.js 18+
- Environment variables
- PostgreSQL database access
- Edge functions (optional, for middleware)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Database Connection Issues

- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check database credentials

### Clerk Authentication Errors

- Verify Clerk keys in `.env.local`
- Ensure Clerk account is properly configured
- Clear browser cookies and try again

### Chat/Video Not Working

- Verify Stream API keys
- Check Stream account status
- Ensure user tokens are being generated correctly

### AI Bot Errors

- Verify Gemini API key is correct
- Check API quota/rate limits
- Ensure proper prompting in getGeminiReply

## 🌟 Key Features Details

### Real-time Chat

- Powered by Stream Chat API
- Support for text messaging
- User presence indicators
- Message history

### Video Calls

- One-on-one video calling
- Built with Stream Video SDK
- Real-time video/audio

### AI Personalities

Each AI bot has a unique personality:

- **Sora**: Great for casual, fun conversations
- **Ram**: Perfect for thoughtful, logical discussions
- **Somya**: Ideal for emotional support and empathy

## 📱 Mobile Optimization

The application is fully responsive with:

- Mobile-first design approach
- Touch-friendly UI components
- Adaptive layouts for all screen sizes
- Optimized navigation for mobile devices

## 🎯 Future Enhancements

Potential features for future versions:

- Direct messaging encryption
- Story/Stories feature
- Video upload and streaming
- Advanced search and filtering
- User recommendation system
- Hashtag support
- Trending topics
- User badges and achievements

## 💡 Tips & Best Practices

1. **Performance**: Posts are fetched with related data and ordered by creation date
2. **UX**: Use skeleton loaders for better perceived performance
3. **Cache**: Leverage Next.js revalidation for fresh data
4. **Images**: Optimize images with Next.js Image component
5. **TypeScript**: Utilize strong typing for safer development

---

**Built with ❤️ by the Revibe Team**

For more information, visit the [documentation](https://nextjs.org/docs) or open an issue on GitHub.
