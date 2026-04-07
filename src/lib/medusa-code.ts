// Real Medusa.js source code from https://github.com/medusajs/medusa (MIT License)
// These are actual production files from the Medusa e-commerce platform v2
// Used by the Code Analyst agent to search for root causes during incident triage

export interface CodeFile {
  path: string;
  content: string;
  lastModified: string;
}

export const MEDUSA_CODE_FILES: CodeFile[] = [
  {
    path: 'src/api/admin/payment-collections/[id]/mark-as-paid/route.ts',
    lastModified: '2026-04-05T14:30:00Z',
    content: `import { markPaymentCollectionAsPaid } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
  refetchEntity,
} from "@medusajs/framework/http"

export const POST = async (
  req: AuthenticatedMedusaRequest<
    HttpTypes.AdminMarkPaymentCollectionAsPaid,
    HttpTypes.SelectParams
  >,
  res: MedusaResponse<HttpTypes.AdminPaymentCollectionResponse>
) => {
  const { id } = req.params

  await markPaymentCollectionAsPaid(req.scope).run({
    input: {
      ...req.body,
      payment_collection_id: id,
      captured_by: req.auth_context.actor_id,
    },
  })

  const paymentCollection = await refetchEntity({
    entity: "payment_collection",
    idOrFilter: id,
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  res.status(200).json({ payment_collection: paymentCollection })
}
`,
  },
  {
    path: 'src/api/admin/inventory-items/[id]/route.ts',
    lastModified: '2026-04-04T09:15:00Z',
    content: `import { MedusaError } from "@medusajs/framework/utils"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  deleteInventoryItemWorkflow,
  updateInventoryItemsWorkflow,
} from "@medusajs/core-flows"
import { refetchInventoryItem } from "../helpers"
import { HttpTypes } from "@medusajs/framework/types"

export const GET = async (
  req: MedusaRequest<HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.AdminInventoryItemResponse>
) => {
  const { id } = req.params
  const inventoryItem = await refetchInventoryItem(
    id,
    req.scope,
    req.queryConfig.fields
  )
  if (!inventoryItem) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Inventory item with id: ' + 'id} was not found'
    )
  }

  res.status(200).json({
    inventory_item: inventoryItem,
  })
}

// Update inventory item
export const POST = async (
  req: MedusaRequest<
    HttpTypes.AdminUpdateInventoryItem,
    HttpTypes.SelectParams
  >,
  res: MedusaResponse<HttpTypes.AdminInventoryItemResponse>
) => {
  const { id } = req.params

  await updateInventoryItemsWorkflow(req.scope).run({
    input: {
      updates: [{ id, ...req.validatedBody }],
    },
  })

  const inventoryItem = await refetchInventoryItem(
    id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({
    inventory_item: inventoryItem,
  })
}

export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse<HttpTypes.AdminInventoryItemDeleteResponse>
) => {
  const id = req.params.id
  const deleteInventoryItems = deleteInventoryItemWorkflow(req.scope)

  await deleteInventoryItems.run({
    input: [id],
  })

  res.status(200).json({
    id,
    object: "inventory_item",
    deleted: true,
  })
}
`,
  },
  {
    path: 'src/api/auth/utils/generate-jwt-token.ts',
    lastModified: '2026-04-03T16:45:00Z',
    content: `import {
  AuthIdentityDTO,
  MedusaContainer,
  ProjectConfigOptions,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  FeatureFlag,
  generateJwtToken,
} from "@medusajs/framework/utils"
import { type Secret } from "jsonwebtoken"
import RbacFeatureFlag from "../../../feature-flags/rbac"

export async function generateJwtTokenForAuthIdentity(
  {
    authIdentity,
    actorType,
    authProvider,
    container,
  }: {
    authIdentity: AuthIdentityDTO
    actorType: string
    authProvider?: string
    container?: MedusaContainer
  },
  {
    secret,
    expiresIn,
    options,
  }: {
    secret: Secret
    expiresIn: string | undefined
    options?: ProjectConfigOptions["http"]["jwtOptions"]
  }
) {
  const expiresIn_ = expiresIn ?? options?.expiresIn
  const entityIdKey = '' + 'actorType}_id'
  const entityId = authIdentity?.app_metadata?.[entityIdKey] as
    | string
    | undefined

  const providerIdentity = !authProvider
    ? undefined
    : authIdentity.provider_identities?.filter(
        (identity) => identity.provider === authProvider
      )[0]

  let roles: string[] | undefined

  if (FeatureFlag.isFeatureEnabled(RbacFeatureFlag.key)) {
    if (container && entityId) {
      try {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: userRoles } = await query.graph({
          entity: actorType,
          fields: ["rbac_roles.id"],
          filters: {
            id: entityId,
          },
        })

        if (userRoles?.[0]?.rbac_roles) {
          roles = userRoles[0].rbac_roles.map((role) => role.id)
        }
      } catch {
        // ignore
      }
    }
  }

  return generateJwtToken(
    {
      actor_id: entityId ?? "",
      actor_type: actorType,
      auth_identity_id: authIdentity?.id ?? "",
      app_metadata: {
        [entityIdKey]: entityId,
        roles,
      },
      user_metadata: providerIdentity?.user_metadata ?? {},
    },
    {
      secret,
      expiresIn: expiresIn_,
      jwtOptions: options,
    }
  )
}
`,
  },
  {
    path: 'src/subscribers/payment-webhook.ts',
    lastModified: '2026-04-05T14:30:00Z',
    content: `import { processPaymentWorkflowId } from "@medusajs/core-flows"
import {
  IPaymentModuleService,
  ProviderWebhookPayload,
} from "@medusajs/framework/types"
import {
  Modules,
  PaymentActions,
  PaymentWebhookEvents,
} from "@medusajs/framework/utils"
import { SubscriberArgs, SubscriberConfig } from "../types/subscribers"

type SerializedBuffer = {
  data: ArrayBuffer
  type: "Buffer"
}

export default async function paymentWebhookhandler({
  event,
  container,
}: SubscriberArgs<ProviderWebhookPayload>) {
  const paymentService: IPaymentModuleService = container.resolve(
    Modules.PAYMENT
  )

  const input = event.data

  if (
    (input.payload?.rawData as unknown as SerializedBuffer)?.type === "Buffer"
  ) {
    input.payload.rawData = Buffer.from(
      (input.payload.rawData as unknown as SerializedBuffer).data
    )
  }

  const processedEvent = await paymentService.getWebhookActionAndData(input)

  if (!processedEvent.data) {
    return
  }

  if (
    processedEvent?.action === PaymentActions.NOT_SUPPORTED ||
    // We currently don't handle these payment statuses in the processPayment function.
    processedEvent?.action === PaymentActions.CANCELED ||
    processedEvent?.action === PaymentActions.FAILED ||
    processedEvent?.action === PaymentActions.REQUIRES_MORE
  ) {
    return
  }

  const wfEngine = container.resolve(Modules.WORKFLOW_ENGINE)
  await wfEngine.run(processPaymentWorkflowId, { input: processedEvent })
}

export const config: SubscriberConfig = {
  event: PaymentWebhookEvents.WebhookReceived,
  context: {
    subscriberId: "payment-webhook-handler",
  },
}
`,
  },
  {
    path: 'src/api/store/carts/[id]/complete/route.ts',
    lastModified: '2026-04-05T11:00:00Z',
    content: `import { completeCartWorkflowId } from "@medusajs/core-flows"
import { prepareRetrieveQuery } from "@medusajs/framework"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { refetchCart } from "../../helpers"
import { defaultStoreCartFields } from "../../query-config"

export const POST = async (
  req: MedusaRequest<{}, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCompleteCartResponse>
) => {
  const cart_id = req.params.id
  const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)

  const { errors, result, transaction } = await we.run(completeCartWorkflowId, {
    input: { id: cart_id },
    throwOnError: false,
  })

  if (!transaction.hasFinished()) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "Cart is already being completed by another request"
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // When an error occurs on the workflow, its potentially got to with cart validations, payments
  // or inventory checks. Return the cart here along with errors for the consumer to take more action
  // and fix them
  if (errors?.[0]) {
    const error = errors[0].error
    const statusOKErrors: string[] = [
      // TODO: add inventory specific errors
      MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
      MedusaError.Types.PAYMENT_REQUIRES_MORE_ERROR,
    ]

    // If we end up with errors outside of statusOKErrors, it means that the cart is not in a state to be
    // completed. In these cases, we return a 400.
    const cartReq = await prepareRetrieveQuery(
      {},
      {
        defaults: defaultStoreCartFields,
      },
      req as MedusaRequest
    )
    const cart = await refetchCart(
      cart_id,
      req.scope,
      cartReq.remoteQueryConfig.fields
    )

    if (!statusOKErrors.includes(error?.type)) {
      throw error
    }

    res.status(200).json({
      type: "cart",
      cart,
      error: {
        message: error.message,
        name: error.name,
        type: error.type,
      },
    })
    return
  }

  const { data } = await query.graph({
    entity: "order",
    fields: req.queryConfig.fields,
    filters: { id: result.id },
  })

  res.status(200).json({
    type: "order",
    order: data[0],
  })
}
`,
  },
  {
    path: 'src/commands/db/create.ts',
    lastModified: '2026-04-02T08:30:00Z',
    content: `import input from "@inquirer/input"
import type { Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  createClient,
  createDb,
  dbExists,
  EnvEditor,
  parseConnectionString,
} from "@medusajs/framework/utils"
import { basename } from "path"
import slugify from "slugify"
import { initializeContainer } from "../../loaders"

async function connectClient(client: ReturnType<typeof createClient>) {
  try {
    await client.connect()
    return { connected: true, error: null }
  } catch (error) {
    return { connected: false, error }
  }
}

/**
 * A low-level utility to create the database. This util should
 * never exit the process implicitly.
 */
export async function dbCreate({
  db,
  directory,
  interactive,
  logger,
}: {
  db: string | undefined
  directory: string
  interactive: boolean
  logger: Logger
}): Promise<boolean> {
  let dbName = db

  /**
   * Loading the ".env" file in editor mode so that
   * we can read values from it and update its
   * contents.
   */
  const envEditor = new EnvEditor(directory)
  await envEditor.load()

  /**
   * Ensure the "DATABASE_URL" is defined before we attempt to
   * create the database.
   *
   * Also we will discard the database name from the connection
   * string because the mentioned database might not exist
   */
  const dbConnectionString = envEditor.get("DATABASE_URL")
  if (!dbConnectionString) {
    logger.error(
      'Missing "DATABASE_URL" inside the .env file. The value is required to connect to the PostgreSQL server'
    )
    return false
  }

  /**
   * Use default value + prompt only when the dbName is not
   * provided via a flag
   */
  if (!dbName) {
    const defaultValue =
      envEditor.get("DB_NAME") ?? 'medusa-' + 'slugify(basename(directory))}'
    if (interactive) {
      dbName = await input({
        message: "Enter the database name",
        default: defaultValue,
        required: true,
      })
    } else {
      dbName = defaultValue
    }
  }

  /**
   * Parse connection string specified as "DATABASE_URL" inside the
   * .env file and create a client instance from it.
   */
  const connectionOptions = parseConnectionString(dbConnectionString)

  /**
   * The following client config is without any database name. This is because
   * we want to connect to the default database (whatever it is) and create
   * a new database that we expect not to exist.
   */
  const clientConfig = {
    host: connectionOptions.host!,
    port: connectionOptions.port ? Number(connectionOptions.port) : undefined,
    user: connectionOptions.user,
    password: connectionOptions.password,
    ...(connectionOptions.ssl ? { ssl: connectionOptions.ssl as any } : {}),
  }

  /**
   * In some case the default database (which is same as the username) does
   * not exist. For example: With Neon, there is no database name after
   * the connection username. Hence, we will have to connect with the
   * postgres database.
   */
  const clientConfigWithPostgresDB = {
    host: connectionOptions.host!,
    port: connectionOptions.port ? Number(connectionOptions.port) : undefined,
    user: connectionOptions.user,
    database: "postgres",
    password: connectionOptions.password,
    ...(connectionOptions.ssl ? { ssl: connectionOptions.ssl as any } : {}),
  }

  /**
   * First connect with the default DB
   */
  let client = createClient(clientConfig)
  let connectionState = await connectClient(client)

  /**
   * In case of an error, connect with the postgres DB
   */
  if (!connectionState.connected) {
    client = createClient(clientConfigWithPostgresDB)
    connectionState = await connectClient(client)
  }

  /**
   * Notify user about the connection state
   */
  if (!connectionState.connected) {
    logger.error(
      "Unable to establish database connection because of the following error"
    )
    logger.error(connectionState.error)
    return false
  }

  logger.info('Connection established with the database "' + 'dbName}"')
  if (await dbExists(client, dbName)) {
    logger.info('Database "' + 'dbName}" already exists')

    envEditor.set("DB_NAME", dbName, { withEmptyTemplateValue: true })
    await envEditor.save()
    logger.info('Updated .env file with "DB_NAME=' + 'dbName}"')

    return true
  }

  await createDb(client, dbName)
  logger.info('Created database "' + 'dbName}"')

  envEditor.set("DB_NAME", dbName)
  await envEditor.save()
  logger.info('Updated .env file with "DB_NAME=' + 'dbName}"')
  return true
}

const main = async function ({ directory, interactive, db }) {
  const container = await initializeContainer(directory, {
    skipDbConnection: true,
  })
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const created = await dbCreate({ directory, interactive, db, logger })
    process.exit(created ? 0 : 1)
  } catch (error) {
    if (error.name === "ExitPromptError") {
      process.exit()
    }
    logger.error(error)
    process.exit(1)
  }
}

export default main
`,
  },
  {
    path: 'src/api/store/products/route.ts',
    lastModified: '2026-04-04T13:00:00Z',
    content: `import { MedusaResponse } from "@medusajs/framework/http"
import { HttpTypes, QueryContextType } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  FeatureFlag,
  isPresent,
  QueryContext,
} from "@medusajs/framework/utils"
import IndexEngineFeatureFlag from "../../../feature-flags/index-engine"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "../../utils/middlewares"
import { RequestWithContext, wrapProductsWithTaxPrices } from "./helpers"

export const GET = async (
  req: RequestWithContext<HttpTypes.StoreProductListParams>,
  res: MedusaResponse<HttpTypes.StoreProductListResponse>
) => {
  if (FeatureFlag.isFeatureEnabled(IndexEngineFeatureFlag.key)) {
    // TODO: These filters are not supported by the index engine yet
    if (
      isPresent(req.filterableFields.tags) ||
      isPresent(req.filterableFields.categories)
    ) {
      return await getProducts(req, res)
    }

    return await getProductsWithIndexEngine(req, res)
  }

  return await getProducts(req, res)
}

async function getProductsWithIndexEngine(
  req: RequestWithContext<HttpTypes.StoreProductListParams>,
  res: MedusaResponse<HttpTypes.StoreProductListResponse>
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const context: QueryContextType = {}
  const withInventoryQuantity = req.queryConfig.fields.some((field) =>
    field.includes("variants.inventory_quantity")
  )

  if (withInventoryQuantity) {
    req.queryConfig.fields = req.queryConfig.fields.filter(
      (field) => !field.includes("variants.inventory_quantity")
    )
  }

  if (isPresent(req.pricingContext)) {
    context["variants"] ??= {}
    context["variants"]["calculated_price"] ??= QueryContext(
      req.pricingContext!
    )
  }

  const filters: Record<string, any> = req.filterableFields
  if (isPresent(filters.sales_channel_id)) {
    const salesChannelIds = filters.sales_channel_id

    filters["sales_channels"] ??= {}
    filters["sales_channels"]["id"] = salesChannelIds

    delete filters.sales_channel_id
  }

  const { data: products = [], metadata } = await query.index(
    {
      entity: "product",
      fields: req.queryConfig.fields,
      filters,
      pagination: req.queryConfig.pagination,
      context,
    },
    {
      cache: {
        enable: true,
      },
      locale: req.locale,
    }
  )

  if (withInventoryQuantity) {
    await wrapVariantsWithInventoryQuantityForSalesChannel(
      req,
      products.map((product) => product.variants).flat(1)
    )
  }

  await wrapProductsWithTaxPrices(req, products)

  res.json({
    products,
    count: metadata!.estimate_count,
    estimate_count: metadata!.estimate_count,
    offset: metadata!.skip,
    limit: metadata!.take,
  })
}

async function getProducts(
  req: RequestWithContext<HttpTypes.StoreProductListParams>,
  res: MedusaResponse<HttpTypes.StoreProductListResponse>
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const context: object = {}
  const withInventoryQuantity = req.queryConfig.fields.some((field) =>
    field.includes("variants.inventory_quantity")
  )

  if (withInventoryQuantity) {
    req.queryConfig.fields = req.queryConfig.fields.filter(
      (field) => !field.includes("variants.inventory_quantity")
    )
  }

  if (isPresent(req.pricingContext)) {
    context["variants"] ??= {}
    context["variants"]["calculated_price"] ??= QueryContext(
      req.pricingContext!
    )
  }

  const { data: products = [], metadata } = await query.graph(
    {
      entity: "product",
      fields: req.queryConfig.fields,
      filters: req.filterableFields,
      pagination: req.queryConfig.pagination,
      context,
    },
    {
      cache: {
        enable: true,
      },
      locale: req.locale,
    }
  )

  if (withInventoryQuantity) {
    await wrapVariantsWithInventoryQuantityForSalesChannel(
      req,
      products.map((product) => product.variants).flat(1)
    )
  }

  await wrapProductsWithTaxPrices(req, products)

  res.json({
    products,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  })
}
`,
  },
  {
    path: 'src/loaders/api.ts',
    lastModified: '2026-04-05T15:00:00Z',
    content: `import { ConfigModule } from "@medusajs/framework/config"
import { ApiLoader } from "@medusajs/framework/http"
import { MedusaContainer, PluginDetails } from "@medusajs/framework/types"
import { FeatureFlag } from "@medusajs/framework/utils"
import { Express } from "express"
import { join } from "path"
import qs from "qs"

type Options = {
  app: Express
  plugins: PluginDetails[]
  container: MedusaContainer
}

export default async ({ app, container, plugins }: Options) => {
  // This is a workaround for the issue described here: https://github.com/expressjs/express/issues/3454
  // We parse the url and get the qs to be parsed and override the query prop from the request
  app.use(function (req, res, next) {
    const parsedUrl = req.url.split("?")
    parsedUrl.shift()
    const queryParamsStr = parsedUrl.join("?")
    if (queryParamsStr) {
      req.query = qs.parse(queryParamsStr, { arrayLimit: Infinity })
    }
    next()
  })

  // Store the initial router stack length before loading API resources for HMR
  if (FeatureFlag.isFeatureEnabled("backend_hmr")) {
    const initialStackLength = (app as any)._router?.stack?.length ?? 0
    ;(global as any).__MEDUSA_HMR_INITIAL_STACK_LENGTH__ = initialStackLength
  }

  const sourcePaths: string[] = []

  /**
   * Always load plugin routes before the Medusa core routes, since it
   * will allow the plugin to define routes with higher priority
   * than Medusa. Here are couple of examples.
   *
   * - Plugin registers a route called "/products/active"
   * - Medusa registers a route called "/products/:id"
   *
   * Now, if Medusa routes gets registered first, then the "/products/active"
   * route will never be resolved, because it will be handled by the
   * "/products/:id" route.
   */
  sourcePaths.push(
    join(__dirname, "../api"),
    ...plugins.map((pluginDetails) => {
      return join(pluginDetails.resolve, "api")
    })
  )

  const {
    projectConfig: {
      http: { restrictedFields },
    },
  } = container.resolve<ConfigModule>("configModule")

  // TODO: Figure out why this is causing issues with test when placed inside ./api.ts
  // Adding this here temporarily
  // Test: (packages/medusa/src/api/routes/admin/currencies/update-currency.ts)
  try {
    await new ApiLoader({
      app: app,
      sourceDir: sourcePaths,
      baseRestrictedFields: restrictedFields?.store,
      container,
    }).load()
  } catch (err) {
    throw Error(
      'An error occurred while registering API Routes. Error: ' + 'err.message}'
    )
  }

  return app
}
`,
  },
  {
    path: 'src/api/admin/draft-orders/route.ts',
    lastModified: '2026-04-05T11:00:00Z',
    content: `import {
  createOrderWorkflow,
  getOrdersListWorkflow,
} from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  AdditionalData,
  CreateOrderDTO,
  HttpTypes,
  OrderDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  OrderStatus,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { refetchOrder } from "./helpers"

export const GET = async (
  req: MedusaRequest<HttpTypes.AdminOrderFilters>,
  res: MedusaResponse<HttpTypes.AdminDraftOrderListResponse>
) => {
  const variables = {
    filters: {
      ...req.filterableFields,
      is_draft_order: true,
    },
    ...req.queryConfig.pagination,
  }

  const workflow = getOrdersListWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      fields: req.queryConfig.fields,
      variables,
    },
  })

  const { rows, metadata } = result as {
    rows: OrderDTO[]
    metadata: any
  }
  res.json({
    draft_orders: rows as unknown as HttpTypes.AdminOrder[],
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<
    HttpTypes.AdminCreateDraftOrder & AdditionalData,
    HttpTypes.AdminDraftOrderParams
  >,
  res: MedusaResponse<HttpTypes.AdminDraftOrderResponse>
) => {
  const input = req.validatedBody
  const workflowInput = {
    ...input,
    no_notification: !!input.no_notification_order,
    status: OrderStatus.DRAFT,
    is_draft_order: true,
  } as CreateOrderDTO & AdditionalData

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  /**
   * If the currency code is not provided, we fetch the region and use the currency code from there.
   */
  if (!workflowInput.currency_code) {
    const queryObject = remoteQueryObjectFromString({
      entryPoint: "region",
      variables: {
        filters: { id: input.region_id },
      },
      fields: ["currency_code"],
    })
    const [region] = await remoteQuery(queryObject)
    workflowInput.currency_code = region?.currency_code
  }

  /**
   * If the email is not provided, we fetch the customer and use the email from there.
   */
  if (!workflowInput.email) {
    const queryObject = remoteQueryObjectFromString({
      entryPoint: "customer",
      variables: {
        filters: { id: input.customer_id },
      },
      fields: ["email"],
    })
    const [customer] = await remoteQuery(queryObject)
    workflowInput.email = customer?.email
  }

  /**
   * We accept either a ID or a payload for both billing and shipping addresses.
   * If either field was received as a string, we assume it's an ID and
   * then ensure that it is passed along correctly to the workflow.
   */
  if (typeof input.billing_address === "string") {
    workflowInput.billing_address_id = input.billing_address
    delete workflowInput.billing_address
  }

  if (typeof input.shipping_address === "string") {
    workflowInput.shipping_address_id = input.shipping_address
    delete workflowInput.shipping_address
  }

  const { result } = await createOrderWorkflow(req.scope).run({
    input: workflowInput,
  })

  const draftOrder = await refetchOrder(
    result.id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ draft_order: draftOrder })
}
`,
  },
];

export const SIMULATED_GIT_LOG = `commit a3f8c2d
Author: dev-sarah <sarah@medusa-store.com>
Date:   Sat Apr 5 14:30:00 2026 -0600
    hotfix: payment webhook handler timeout handling

commit c4d2f1e
Author: dev-marcus <marcus@medusa-store.com>
Date:   Sat Apr 5 15:00:00 2026 -0600
    fix: improve API loader error handling

commit 9a8b3c7
Author: dev-sarah <sarah@medusa-store.com>
Date:   Sat Apr 5 11:00:00 2026 -0600
    feat: cart completion race condition guard

commit e5f7d2a
Author: dev-marcus <marcus@medusa-store.com>
Date:   Sat Apr 5 11:00:00 2026 -0600
    feat: draft order creation with region/customer resolution

commit b2c4e8f
Author: deploy-bot <deploy@medusa-store.com>
Date:   Fri Apr 4 13:00:00 2026 -0600
    feat: product listing with index engine support

commit 1d3a5b7
Author: dev-sarah <sarah@medusa-store.com>
Date:   Fri Apr 4 09:15:00 2026 -0600
    refactor: inventory item CRUD with workflow pattern

commit 8f2e6c9
Author: dev-marcus <marcus@medusa-store.com>
Date:   Thu Apr 3 16:45:00 2026 -0600
    feat: JWT token generation with RBAC role resolution

commit 4a7d9e1
Author: deploy-bot <deploy@medusa-store.com>
Date:   Wed Apr 2 08:30:00 2026 -0600
    chore: database creation command with SSL support`;

export function searchCodeFiles(query: string): CodeFile[] {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);

  return MEDUSA_CODE_FILES.filter(file => {
    const contentLower = file.content.toLowerCase();
    const pathLower = file.path.toLowerCase();
    return keywords.some(kw => contentLower.includes(kw) || pathLower.includes(kw));
  }).sort((a, b) => {
    const aScore = keywords.filter(kw => a.content.toLowerCase().includes(kw) || a.path.toLowerCase().includes(kw)).length;
    const bScore = keywords.filter(kw => b.content.toLowerCase().includes(kw) || b.path.toLowerCase().includes(kw)).length;
    return bScore - aScore;
  });
}

export function getRecentChanges(hours: number = 48): CodeFile[] {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return MEDUSA_CODE_FILES.filter(f => new Date(f.lastModified) > cutoff);
}