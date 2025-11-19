const logger = require('../utils/logger');
const registryService = require('./registryService');
const knowledgeGraphService = require('./knowledgeGraphService');

/**
 * AI Routing Service - Uses OpenAI to intelligently route requests to microservices
 */
class RoutingService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    logger.info('RoutingService initialized', {
      hasApiKey: !!this.openaiApiKey,
      model: this.model
    });
  }

  /**
   * Get service context for AI prompt (from knowledge graph)
   * @returns {string} - Formatted string of available services
   */
  async getServicesContext() {
    const graph = await knowledgeGraphService.getGraph();
    const services = graph.nodes.map(node => node.data);
    
    if (services.length === 0) {
      return 'No services are currently registered.';
    }

    return services.map((service, index) => {
      return `${index + 1}. ${service.serviceName} (v${service.version})
   - Endpoint: ${service.endpoint}
   - Status: ${service.status}
   - Description: Handles ${this.inferServicePurpose(service.serviceName)}`;
    }).join('\n\n');
  }

  /**
   * Infer service purpose from name (simple heuristic)
   * @param {string} serviceName 
   * @returns {string}
   */
  inferServicePurpose(serviceName) {
    const name = serviceName.toLowerCase();
    if (name.includes('user')) return 'user management, authentication, profiles';
    if (name.includes('product')) return 'product catalog, inventory, search';
    if (name.includes('order')) return 'order processing, payments, shipping';
    if (name.includes('payment')) return 'payment processing, transactions';
    if (name.includes('notification')) return 'notifications, messaging';
    return 'various operations';
  }

  /**
   * Build OpenAI prompt for routing decision
   * @param {string} userQuery - The user's request/query
   * @param {Object} requestContext - Additional context (method, path, body)
   * @returns {Promise<string>}
   */
  async buildRoutingPrompt(userQuery, requestContext = {}) {
    const servicesContext = await this.getServicesContext();
    
    return `You are an intelligent API router for a microservices architecture. Your job is to determine which microservice should handle a given request.

Available Microservices:
${servicesContext}

User Request:
- Query/Intent: ${userQuery}
- HTTP Method: ${requestContext.method || 'GET'}
- Path: ${requestContext.path || '/'}
${requestContext.body ? `- Body: ${JSON.stringify(requestContext.body)}` : ''}

Instructions:
1. Analyze the user's request and determine which microservice is most appropriate to handle it.
2. Consider the service name, version, and inferred purpose.
3. Return ONLY a JSON object with this exact format:
{
  "serviceName": "exact-service-name-from-list",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

If no service matches, return:
{
  "serviceName": null,
  "confidence": 0.0,
  "reasoning": "No suitable service found"
}

Respond with ONLY the JSON, no additional text.`;
  }

  /**
   * Call OpenAI API for routing decision
   * @param {string} prompt 
   * @returns {Promise<Object>}
   */
  async callOpenAI(prompt) {
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    try {
      const response = await fetch(this.openaiApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an intelligent API router. Respond only with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim();
      
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse JSON response (handle markdown code blocks if present)
      let jsonContent = content;
      if (content.startsWith('```')) {
        jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const routingDecision = JSON.parse(jsonContent);
      return routingDecision;
    } catch (error) {
      logger.error('OpenAI API call failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Route request using AI
   * @param {string} userQuery - User's query/intent
   * @param {Object} requestContext - Request context
   * @returns {Promise<Object>} - Routing decision with service info
   */
  async routeRequest(userQuery, requestContext = {}) {
    try {
      // Build prompt
      const prompt = await this.buildRoutingPrompt(userQuery, requestContext);
      
      // Call OpenAI
      const aiDecision = await this.callOpenAI(prompt);
      
      // Get full service details
      let targetService = null;
      if (aiDecision.serviceName) {
        targetService = await registryService.getServiceByName(aiDecision.serviceName);
      }

      logger.info('AI routing decision', {
        query: userQuery,
        serviceName: aiDecision.serviceName,
        confidence: aiDecision.confidence,
        found: !!targetService
      });

      return {
        success: true,
        routing: {
          serviceName: aiDecision.serviceName,
          confidence: aiDecision.confidence,
          reasoning: aiDecision.reasoning,
          service: targetService ? {
            endpoint: targetService.endpoint,
            version: targetService.version,
            status: targetService.status
          } : null
        }
      };
    } catch (error) {
      logger.error('Routing failed', {
        error: error.message,
        query: userQuery
      });

      // Fallback: return all services for manual selection
      const availableServices = await registryService.getAllServices();
      return {
        success: false,
        error: error.message,
        fallback: {
          availableServices
        }
      };
    }
  }

  /**
   * Simple rule-based routing (fallback when OpenAI is unavailable)
   * @param {string} query 
   * @returns {Promise<Object>}
   */
  async fallbackRouting(query) {
    // Try to find service using knowledge graph first
    const matchedService = await knowledgeGraphService.findServiceByQuery(query);
    
    if (matchedService) {
      return {
        success: true,
        routing: {
          serviceName: matchedService.serviceName,
          confidence: 0.8,
          reasoning: 'Matched using knowledge graph',
          service: {
            endpoint: matchedService.endpoint,
            version: matchedService.version,
            status: matchedService.status
          }
        }
      };
    }

    // Fallback to simple keyword matching
    const services = await registryService.getAllServices();
    const queryLower = query.toLowerCase();

    // Simple keyword matching
    for (const service of services) {
      const serviceNameLower = service.serviceName.toLowerCase();
      if (queryLower.includes(serviceNameLower.split('-')[0])) {
        return {
          success: true,
          routing: {
            serviceName: service.serviceName,
            confidence: 0.7,
            reasoning: 'Matched by keyword',
            service: {
              endpoint: service.endpoint,
              version: service.version,
              status: service.status
            }
          }
        };
      }
    }

    return {
      success: false,
      error: 'No matching service found',
      fallback: {
        availableServices: services
      }
    };
  }
}

// Singleton instance
const routingService = new RoutingService();

module.exports = routingService;

