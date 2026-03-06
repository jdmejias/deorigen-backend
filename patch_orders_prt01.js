const fs = require('fs');

const controllerPath = '../deorigen-backend/src/orders/orders.controller.ts';
let ctrlData = fs.readFileSync(controllerPath, 'utf8');

ctrlData = ctrlData.replace(/@Roles\(Role.ADMIN\)\s+@ApiOperation\({ summary: 'Listar todos los pedidos \(admin\)' }\)\s+findAll\(@Query\(\) query: OrdersQueryDto, @Query\(\) pagination: PaginationDto\)/, 
`@Roles(Role.ADMIN, Role.PARTNER)
  @ApiOperation({ summary: 'Listar pedidos (admin/partner)' })
  findAll(
    @Query() query: OrdersQueryDto,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: any,
  )`);
  
ctrlData = ctrlData.replace('return this.ordersService.findAll(query, pagination);', 
`return this.ordersService.findAllForRole(query, pagination, user);`);
  
fs.writeFileSync(controllerPath, ctrlData, 'utf8');

const servicePath = '../deorigen-backend/src/orders/orders.service.ts';
let srvData = fs.readFileSync(servicePath, 'utf8');

const newMethod = `
  async findAllForRole(query: OrdersQueryDto, pagination: PaginationDto, user: any) {
    if (user.role === 'PARTNER') {
      const partner = await this.prisma.partner.findUnique({
        where: { userId: user.id },
        include: { country: true }
      });
      if (partner?.country?.code) {
        query.countryCode = partner.country.code;
      }
    }
    return this.findAll(query, pagination);
  }

  async findAll(query: OrdersQueryDto, pagination: PaginationDto, userId?: string) {`;

srvData = srvData.replace(`async findAll(query: OrdersQueryDto, pagination: PaginationDto, userId?: string) {`, newMethod);

fs.writeFileSync(servicePath, srvData, 'utf8');

console.log('Orders PRT-01 applied!');
