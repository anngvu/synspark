# 🧠 SynSpark: Synapse Self-Assessment Quiz

**An internal learning resource for Sage Bionetworks team members to test their Synapse platform knowledge.**

SynSpark is a web-based quiz application designed to help Sage team members assess their understanding of the Synapse platform's features, best practices, and advanced concepts. The questions are curated from real forum discussions, support tickets, and internal knowledge to help team members stay sharp on platform details and common user scenarios.

## 🚀 Take the Quiz

**Ready to test your Synapse knowledge?** 

👉 **[Start the SynSpark Quiz](https://anngvu.github.io/synspark/)** 👈

- Diverse questions with easy starters to build confidence
- Earn points based on answer accuracy  
- Get instant feedback with explanations
- Complete 80%+ to earn your SynSpark badge!

## 🎯 What You'll Learn

- **Data Storage & Migration**: Understanding storage locations, external buckets, and migration strategies
- **Access Control**: File permissions, ACLs, and user management
- **API & Integration**: Rate limiting, bulk operations, and programmatic access
- **Advanced Features**: Materialized views, file versioning, and entity tracking
- **Best Practices**: Performance optimization, data transfer costs, and platform positioning

## 📊 Features

- **30+ Curated Questions** from real Synapse forum discussions and support cases
- **Multiple Difficulty Levels**: Beginner, Intermediate, and Advanced
- **Smart Question Ordering** with confidence-building starters and linked scenarios
- **Interactive Quiz Experience** with immediate feedback
- **Achievement System** with downloadable badges
- **Progress Tracking** and detailed results breakdown
- **Question Navigation** - jump to any question or review your answers

---

## 🛠️ For Contributors

Want to add questions or improve the quiz? Here's how to get started with development.

### Getting Started for Development

1. **Clone this repository**:
   ```bash
   git clone https://github.com/anngvu/synspark.git
   cd synspark
   ```

2. **Serve the files locally** (required for loading questions):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```

3. **Open in your browser**: `http://localhost:8000`

### Project Structure

```
synspark/
├── index.html              # Main quiz interface
├── quiz.js                 # Quiz logic and functionality
├── questions/curated/      # YAML question files
│   ├── forum_*.yaml       # Questions from forum discussions
│   ├── other_*.yaml       # Additional curated content
│   └── confluence_*.yaml  # Questions from Confluence
├── synspark_action_potential.png  # Achievement badge
├── LICENSE                 # CC0 1.0 Universal License
└── README.md              # This file
```

### Question Format

Questions are stored as YAML files with the following structure:

```yaml
type: "quiz"
id: "unique_question_identifier"  # Required for dependencies
title: "Question Title"
level: "beginner|intermediate|advanced"
starter: true  # Optional: marks question as confidence-building starter
followup_to: "parent_question_id"  # Optional: creates dependency chain
context: |
  Background information or scenario
question: "The actual question text"
answers:
  - text: "Answer option"
    correct: true/false
    message: "Explanation for this choice"
    points: 1  # Points awarded for correct answers
allow_retry: true/false
random_answer_order: true/false
multiple_correct: true/false  # For questions with multiple valid answers
```

### Adding New Questions

1. **Create a new YAML file** in `questions/curated/`
2. **Follow the naming convention**: `forum_topic_description.yaml` or `other_topic_description.yaml`
3. **Update the question list** in `quiz.js` (lines 17-50)
4. **Test your question** by running the quiz locally

### Key Components

- **`Quiz` class** (`quiz.js`): Core quiz logic, question loading, scoring
- **Smart Shuffling**: Constraint-aware ordering with starter questions and dependencies
- **Question Loading**: Async loading of YAML files with error handling
- **UI Management**: Dynamic HTML generation, state management, navigation
- **Scoring System**: Points-based with support for multiple correct answers
- **Achievement System**: Badge generation based on completion percentage

### Development Guidelines

- **Questions should be educational**: Based on real user scenarios and common issues
- **Include context**: Provide background information to make questions meaningful  
- **Write clear explanations**: Each answer should include helpful feedback
- **Use unique IDs**: Each question needs a unique `id` field for dependency tracking
- **Consider difficulty progression**: Mark approachable questions as `starter: true`
- **Link related scenarios**: Use `followup_to` to create question dependencies
- **Test thoroughly**: Ensure questions load properly and scoring works correctly
- **Follow existing patterns**: Maintain consistency with current question structure

### Contributing

1. Fork the repository
2. Create a feature branch
3. Add your questions or improvements
4. Test locally
5. Submit a pull request

Questions are curated from actual Synapse forum discussions, Confluence documentation, and community feedback to ensure they reflect real-world usage scenarios.

---

## 📝 License

This project is released under the [CC0 1.0 Universal License](LICENSE) - completely free to use, modify, and distribute!