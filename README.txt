# Study Guide Creator

## Project Description

Study Guide Creator is a web application that empowers users to upload textbooks in various formats (PDF, PNG, or Markdown) and automatically generate comprehensive study materials using OpenAI's advanced language models. The application processes the uploaded content and creates structured study guides including summaries, key points, flashcards, quizzes, and outlines to enhance learning efficiency.

## Features

- **File Upload Support**: Upload textbooks in PDF, PNG, or Markdown formats
- **AI-Powered Generation**: Leverages OpenAI API for intelligent content analysis and generation
- **Multiple Study Materials**:
  - Summaries of chapters or entire books
  - Key points extraction
  - Interactive flashcards
  - Practice quizzes
  - Detailed outlines
- **User-Friendly Interface**: Clean, responsive design built with React and TailwindCSS
- **Real-time Processing**: Instant generation of study materials upon upload
- **Export Options**: Save generated materials in various formats

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: TailwindCSS
- **Backend**: Node.js, Express
- **AI Integration**: OpenAI API
- **Build Tools**: Vite, PostCSS
- **Package Manager**: pnpm

## Installation Guide

### Prerequisites

- Node.js (version 20 or higher)
- pnpm package manager
- OpenAI API key

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd study-guide-creator
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the development server**
   ```bash
   pnpm run dev
   ```

5. **Build for production** (optional)
   ```bash
   pnpm run build
   ```

## Usage

1. **Access the Application**
   
   Open your browser and navigate to `http://localhost:5173` (or the port specified by Vite).

2. **Upload Files**
   
   - Click on the upload area or drag and drop your textbook files
   - Supported formats: PDF, PNG, Markdown
   - Maximum file size: [specify if known]

3. **Generate Study Materials**
   
   - Select the type of study material you want to generate (summary, flashcards, quiz, etc.)
   - Click "Generate" to process the uploaded content
   - Wait for the AI to analyze and create the materials

4. **View and Export**
   
   - Review the generated study materials
   - Export or save them as needed

## Screenshots/Preview

*[Add screenshots here]*

- Main upload interface
- Generated study guide example
- Flashcard view
- Quiz interface

## Contributing

We welcome contributions to improve Study Guide Creator! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write clear, concise commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ using React, TypeScript, and OpenAI*