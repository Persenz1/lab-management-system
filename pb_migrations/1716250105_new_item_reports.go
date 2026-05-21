package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		locationsCollection, err := app.FindCollectionByNameOrId("locations")
		if err != nil {
			return err
		}
		itemsCollection, err := app.FindCollectionByNameOrId("items")
		if err != nil {
			return err
		}

		collection := core.NewBaseCollection("new_item_reports")

		collection.Fields.Add(
			&core.TextField{Name: "reporter_name", Required: true},
			&core.TextField{Name: "name", Required: true},
			&core.SelectField{
				Name:     "item_type",
				Required: true,
				Values:   []string{"3D打印材料", "机械耗材", "电子元件", "化学材料", "工具", "其他"},
			},
			&core.TextField{Name: "specification", Required: false},
			&core.SelectField{
				Name:     "initial_status",
				Required: true,
				Values:   []string{"正常", "使用中", "余量低"},
			},
			&core.RelationField{
				Name:         "location",
				Required:     false,
				CollectionId: locationsCollection.Id,
				MaxSelect:    types.Pointer(1),
			},
			&core.TextField{Name: "location_note", Required: false},
			&core.TextField{Name: "note", Required: false},
			&core.SelectField{
				Name:     "review_status",
				Required: true,
				Values:   []string{"待审核", "已通过", "已拒绝"},
			},
			&core.TextField{Name: "reviewed_by", Required: false},
			&core.TextField{Name: "reviewed_at", Required: false},
			&core.RelationField{
				Name:         "created_item",
				Required:     false,
				CollectionId: itemsCollection.Id,
				MaxSelect:    types.Pointer(1),
			},
		)

		collection.ListRule = types.Pointer("")
		collection.ViewRule = types.Pointer("")
		collection.CreateRule = types.Pointer("")
		collection.UpdateRule = nil
		collection.DeleteRule = nil

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("new_item_reports")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
